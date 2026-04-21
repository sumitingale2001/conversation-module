'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import useConversationStore from '../../../../../store/conversation.store';
import { useRecordingStore } from '../../../../../store/recording.store';
import useGetConversation from '../../../../../hooks/use-get-conversation';
import apiInstance from '../../../../../config/apiInstance';
import axios from 'axios';
import { conversationServices, roundVal } from '../../../../../services/conversationServices';
import TranscriptCard from './transcript-card';
import RecordingPanel from './recording-panel';

const RecordingExperience = () => {
    const { conversation, setConversation } = useConversationStore();
    const { stopRecording, reset, startRecording, duration } = useRecordingStore();
    const { getConversation } = useGetConversation();
    
    const [pollingError, setPollingError] = useState(false);
    const [isProcessingLocal, setIsProcessingLocal] = useState(false);
    const isProcessing = conversation?.status === "processing";
    const pollingIntervalRef = useRef(null);
    const timeoutRef = useRef(null);

    // 🔥 POLLING SYSTEM (MANDATORY)
    useEffect(() => {
        if (conversation?.status === "processing") {
            // Prevent multiple intervals
            if (pollingIntervalRef.current) return;
            
            setPollingError(false);
            
            // Interval: 2-3 seconds
            pollingIntervalRef.current = setInterval(() => {
                getConversation({ conversationId: conversation._id, workspaceId: conversation.workspaceId });
            }, 3000);

            // Safety timeout: 60s
            timeoutRef.current = setTimeout(() => {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
                setPollingError(true);
            }, 60000);
        } else if (conversation?.status === "completed" || conversation?.status === "failed") {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }

        // Cleanup on unmount
        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            pollingIntervalRef.current = null;
        };
    }, [conversation?.status, conversation?._id, conversation?.workspaceId, getConversation]);

    const handleReset = () => {
        reset();
    };

    const uploadToS3 = async (blob, filename) => {
        try {
            // 1. Get presigned URL
            const { data: presignData } = await apiInstance.post('/uploads/presign', {
                filename,
                contentType: blob.type || 'audio/webm',
                contentLength: blob.size,
            });

            const { putUrl, objectKey } = presignData;

            // 2. Upload blob directly to S3
            await axios.put(putUrl, blob, {
                headers: { 'Content-Type': blob.type || 'audio/webm' }
            });

            // 3. Construct File URL (Standard S3 path format)
            const bucket = "docrag-uploads-dev-058264258120";
            const region = "ap-south-1";
            return `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;
        } catch (error) {
            console.error("S3 Upload Failed:", error);
            throw new Error("Failed to upload audio to storage.");
        }
    };

    const handleConfirm = async () => {
        // RULE 1: PREVENT DOUBLE CLICK
        if (isProcessingLocal || !duration) return;
        setIsProcessingLocal(true);
        setPollingError(false);

        try {
            // STEP 1 & 2 - STOP RECORDING & GET FINAL BLOB
            const finalBlob = await stopRecording();
            if (!finalBlob) throw new Error("Recording failed to generate audio payload.");

            // STEP 3 - UPLOAD TO S3
            const filename = `recording-${Date.now()}.webm`;
            const fileUrl = await uploadToS3(finalBlob, filename);

            // STEP 4 - APPEND SEGMENT
            const appendData = {
                conversationId: conversation?._id,
                workspaceId: conversation?.workspaceId,
                fileUrl,
                duration: roundVal(duration),
                startTime: roundVal(0),
                endTime: roundVal(duration),
            };

            // RULE 3: APPEND FAIL -> RETRY ONCE
            try {
                const res = await conversationServices.appendSegment(appendData);
                if (!res.success) throw new Error(res.error);
            } catch (err) {
                console.warn("Initial append failed, retrying once...");
                const retryRes = await conversationServices.appendSegment(appendData);
                if (!retryRes.success) throw new Error(retryRes.error);
            }

            // STEP 5 - WAIT 1–1.5 SECONDS (Stabilization buffer)
            await new Promise(resolve => setTimeout(resolve, 1200));

            // STEP 6 - FINALIZE
            // RULE 3: FINALIZE FAIL -> RETRY ALLOWED
            const finalizeRes = await conversationServices.finalizeRecording({
                conversationId: conversation?._id,
                workspaceId: conversation?.workspaceId
            });
            if (!finalizeRes.success) console.error("Finalization failed:", finalizeRes.error);

            // STEP 7 - UPDATE STATE
            setConversation({ ...conversation, status: "processing" });

            // STEP 8 - START POLLING (Interval: 2-3 seconds)
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = setInterval(() => {
                getConversation({ 
                    conversationId: conversation?._id, 
                    workspaceId: conversation?.workspaceId 
                });
            }, 3000);

        } catch (error) {
            console.error("Recording Finalization Error:", error);
            setPollingError(true);
        } finally {
            setIsProcessingLocal(false);
        }
    };

    return (
        <>
        <div className="flex flex-col h-full w-full bg-gray-50/30">
            {pollingError && (
                <div className="w-full bg-red-100 text-red-600 text-xs py-2 px-4 text-center font-medium shadow-sm z-50">
                    Processing failed. Please retry.
                </div>
            )}
            

            <main className="flex-1 overflow-y-auto px-6 py-6" style={{ minHeight: '300px' }}>
                <TranscriptCard />
            </main>

            <div className="px-6 pb-6">
                <RecordingPanel 
                    handleReset={handleReset}
                    handleConfirm={handleConfirm}
                />
            </div>
        </div>
        </>
    );
};

export default RecordingExperience;
