/**
 * RecordingExperience Component
 * Manages the recording session, status polling, and transcript rendering.
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Undo2, Redo2 } from 'lucide-react';
import useConversationStore from '../../../../../store/conversation.store';
import { useRecordingStore } from '../../../../../store/recording.store';
import useGetConversation from '../../../../../hooks/use-get-conversation';
import apiInstance from '../../../../../config/apiInstance';
import { conversationServices, roundVal } from '../../../../../services/conversationServices';
import TranscriptCard from './transcript-card';
import RecordingPanel from './recording-panel';
import { workspaceId } from '../../../../../utils/conversation.utils';

const RecordingExperience = ({ slug }) => {
    const router = useRouter();
    const { conversation, setConversation, segments } = useConversationStore();
    const { stopRecording, reset, startRecording, duration, audioChunks, isRecording,    } = useRecordingStore();
    const { getConversation } = useGetConversation();

    const [isProcessingLocal, setIsProcessingLocal] = useState(false);
    const hasStartedRecording = useRef(false);

    // FIX 1a: Create a ref to keep getConversation current without triggering re-renders in effects.
    const getConversationRef = useRef(getConversation);

    // (a) Syncs the ref with the latest getConversation function from the hook.
    // (b) No dependency array - runs every render to ensure the ref is never stale.
    useEffect(() => {
        getConversationRef.current = getConversation;
    });

    const [error, setError] = useState(false);
    const [pendingSegmentName, setPendingSegmentName] = useState('');

    const handleRestartConfirm = async () => {
        reset();
        setPendingSegmentName('');
        if (slug === 'instant' && conversation?._id) {
            try {
                await conversationServices.deleteConversation(conversation._id, {
                    workspaceId,
                });
            } catch (e) {
                console.warn('Restart: failed to delete conversation', e);
            }
            router.back();
        }
    };
    
    // Auto-start guard: waits for conversation to load before checking segments.
    // Using conversation?._id as the gate ensures we never read an empty 
    // segments array that simply hasn't been fetched yet.
    // hasStartedRecording ref ensures this only fires once per session.
    useEffect(() => {
        // Wait until conversation is loaded from server (conversation._id exists).
        // Only then check if segments are empty and slug is "instant".
        // This prevents premature start before the initial getConversation 
        // fetch resolves, which would incorrectly read segments as [] 
        // even when the server has existing segments.
        if (!conversation?._id) return;
        if (hasStartedRecording.current) return;
        if (slug !== "instant") return;

        const currentSegments = useConversationStore.getState().segments;
        if ((currentSegments?.length || 0) === 0) {
            hasStartedRecording.current = true;
            startRecording();
        }
    }, [conversation?._id, slug]);

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
            setError(true);
            throw new Error("Workspace ID is missing. Cannot finalize recording.");
        }

        setIsProcessingLocal(true);
        setError(false);

        try {
            // STEP 1 & 2 - STOP RECORDING & GET FINAL BLOB
            // FIX 5: Destructure both blob and duration from the returned object.
            const { blob: finalBlob, duration: finalDuration } = await stopRecording();
            
            // Guard: Ensure we have a valid, non-empty recording.
            if (!finalBlob || finalBlob.size === 0) {
                throw new Error("Empty audio blob generated. Recording failed.");
            }

            // STEP 3 - UPLOAD TO BACKEND API
            const fileUrl = await uploadAudio(finalBlob);

            // STEP 4 - APPEND SEGMENT
            const appendData = {
                conversationId: conversation?._id,
                workspaceId,
                fileUrl,
                duration: roundVal(finalDuration), // Use captured duration, not store duration.
                startTime: roundVal(0),
                endTime: roundVal(finalDuration),
            };

            // RULE 3: APPEND FAIL -> RETRY ONCE
            let newSegmentId = null;
            try {
                const res = await conversationServices.appendSegment(appendData);
                if (!res.success) throw new Error(res.error);
                newSegmentId = res?.data?._id;
            } catch (err) {
                console.warn("Initial append failed, retrying once...");
                const retryRes = await conversationServices.appendSegment(appendData);
                if (!retryRes.success) throw new Error(retryRes.error);
                newSegmentId = retryRes?.data?._id;
            }

            if (pendingSegmentName.trim() && newSegmentId) {
                try {
                    await conversationServices.renameSegment({
                        segmentId: newSegmentId,
                        conversationId: conversation?._id,
                        workspaceId,
                        name: pendingSegmentName.trim(),
                    });
                } catch (e) {
                    console.warn('Rename non-fatal:', e);
                }
            }

            // STEP 5 - WAIT 1–1.5 SECONDS (Stabilization buffer)
            // Gives the server time to persist the appended segment before we fetch.
            await new Promise(resolve => setTimeout(resolve, 1200));

            // STEP 6 - REFRESH CONVERSATION FROM SERVER
            // Fetches the updated conversation including the newly appended segment.
            // This ensures TranscriptCard shows the new segment immediately after confirm.
            // We do NOT rely on setConversation({ status: "pending" }) alone because 
            // that would leave the segments array stale in the store.
            await getConversationRef.current({
                conversationId: conversation?._id,
                workspaceId,
            });
            // NOTE: Do NOT manually call setConversation after this. 
            // getConversation already calls setConversation internally via the hook.
            // Calling it again would overwrite the freshly fetched data with stale data.

        } catch (error) {
            console.error("Recording Finalization Error:", error);
            setError(true);
        } finally {
            setPendingSegmentName('');
            setIsProcessingLocal(false);
        }
    };


    return (
        <>
        <div className="flex flex-col h-full w-full bg-gray-50/30">
            {error && (
                <div className="w-full bg-red-100 text-red-600 text-xs py-2 px-4 text-center font-medium shadow-sm z-50">
                    Operation failed. Please retry.
                </div>
            )}
            

            <main className="flex-1 overflow-y-auto px-6 py-6" style={{ minHeight: '300px' }}>
                <TranscriptCard
                    slug={slug}
                    pendingSegmentName={pendingSegmentName}
                />
            </main>

            <div className="px-6 pb-6">
                <RecordingPanel 
                    slug={slug}
                    onRestartConfirm={handleRestartConfirm}
                    handleConfirm={handleConfirm}
                    pendingName={pendingSegmentName}
                    onPendingNameChange={setPendingSegmentName}
                />
            </div>
        </div>
        </>
    );
};

export default RecordingExperience;

