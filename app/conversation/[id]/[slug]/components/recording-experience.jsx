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
    const { conversation, setConversation, segments } = useConversationStore();
    const { stopRecording, reset, startRecording, duration, audioChunks, isRecording,  } = useRecordingStore();
    const { getConversation } = useGetConversation();

    const [pollingError, setPollingError] = useState(false);
    const [isProcessingLocal, setIsProcessingLocal] = useState(false);
    const isProcessing = conversation?.status === "processing";
    const pollingIntervalRef = useRef(null);
    const timeoutRef = useRef(null);
    const hasStartedRecording = useRef(false);

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

            // Bug 1: One final fetch to ensure segments are updated
            if (conversation?.status === "completed") {
                getConversation({ conversationId: conversation._id, workspaceId: conversation.workspaceId });
            }
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
    

    useEffect(() => {
        if (!hasStartedRecording.current && segments?.length === 0) {
            hasStartedRecording.current = true;
            startRecording();
        }
    }, [segments?.length, startRecording]);

    

    const workspaceId = conversation?.workspaceId;

    const uploadAudio = async (blob) => {
        try {
            const formData = new FormData();
            formData.append('file', blob);
            formData.append('conversationId', conversation?._id);
            formData.append('workspaceId', workspaceId);

            const { data } = await apiInstance.post('/uploads/audio', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (!data.success) {
                throw new Error("Upload failed");
            }

            return data.fileUrl;
        } catch (error) {
            console.error("Upload Failed:", error);
            throw new Error("Failed to upload audio.");
        }
    };

    const handleConfirm = async () => {
        // RULE 1: PREVENT DOUBLE CLICK
        if (isProcessingLocal || !duration) return;

        // Bug 3: Throw early if workspaceId is missing
        if (!workspaceId) {
            setPollingError(true);
            throw new Error("Workspace ID is missing. Cannot finalize recording.");
        }

        setIsProcessingLocal(true);
        setPollingError(false);

        try {
            // STEP 1 & 2 - STOP RECORDING & GET FINAL BLOB
            const finalBlob = await stopRecording();
            if (!finalBlob) throw new Error("Recording failed to generate audio payload.");

            // STEP 3 - UPLOAD TO BACKEND API
            const fileUrl = await uploadAudio(finalBlob);

            // STEP 4 - APPEND SEGMENT
            const appendData = {
                conversationId: conversation?._id,
                workspaceId,
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

            // ENSURE TRANSCRIPT EXISTS (GET /transcript)
            // RULE: If GET fails -> STOP. Do NOT trigger transcription
            try {
                const ensureRes = await conversationServices.ensureTranscript({
                    conversationId: conversation?._id,
                    workspaceId
                });
                if (!ensureRes || !ensureRes.success) {
                    throw new Error("Transcript does not exist or GET failed.");
                }
            } catch (err) {
                console.error("GET /transcript failed, stopping transcription flow:", err);
                throw new Error("Transcript does not exist or GET failed.");
            }

            // STEP 6 - TRIGGER TRANSCRIPTION
            // RULE 3: TRIGGER FAIL -> LOG ONLY
            try {
                const triggerRes = await conversationServices.triggerTranscription({
                    conversationId: conversation?._id,
                    workspaceId
                });
                if (!triggerRes.success) console.error("Transcription trigger failed:", triggerRes.error);
            } catch (err) {
                console.error("Transcription trigger error:", err);
            }

            // STEP 7 - UPDATE STATE
            // Bug 1: Only call setConversation, let useEffect polling take over
            setConversation({ ...conversation, status: "processing" });

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
