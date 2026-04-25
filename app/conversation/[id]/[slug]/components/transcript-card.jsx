'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, MoreHorizontal, FileText, Loader2 } from 'lucide-react';
import useConversationStore from '../../../../../store/conversation.store';
import { conversationServices } from '../../../../../services/conversationServices';
import { workspaceId } from '../../../../../utils/conversation.utils';
import apiInstance from '../../../../../config/apiInstance';
import useGetConversation from '../../../../../hooks/use-get-conversation';
import { useRecordingStore } from '../../../../../store/recording.store';

const formatMs = (ms) => {
    if (!ms && ms !== 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const TranscriptCard = () => {
    const { conversation, segments, transcript, setConversation } = useConversationStore();
    const { isRecording, startRecording } = useRecordingStore();
    const { getConversation } = useGetConversation();
    
    // STATE MANAGEMENT (local only)
    const [transcribingSegmentId, setTranscribingSegmentId] = useState(null);
    const [error, setError] = useState({ segmentId: null, message: "" });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    const fileInputRef = useRef(null);
    const getConversationRef = useRef(getConversation);

    const isProcessing = conversation?.status === "processing";
    const isCompleted = conversation?.status === "completed";

    // Sync getConversationRef to avoid stale closures in async handlers
    useEffect(() => { 
        getConversationRef.current = getConversation; 
    });

    // REACTION TO POLLING RESULTS
    useEffect(() => {
        // Reacts to polling results from RecordingExperience.
        // Clears loading/sets error when transcription job resolves.
        if (conversation?.status === "completed") {
            setTranscribingSegmentId(null);
            setError({ segmentId: null, message: "" });
        } else if (conversation?.status === "failed") {
            setTranscribingSegmentId(null);
            setError({ 
                segmentId: transcribingSegmentId, 
                message: "Transcription failed. Please try again." 
            });
        }
    }, [conversation?.status]);

    // TRANSCRIBE BUTTON CLICK HANDLER
    const onTranscribeClick = async (segmentId) => {
        // Guard 1 & 2: prevent concurrent transcription attempts
        if (transcribingSegmentId !== null || isProcessing) return;

        // Step 1 — Set transcribingSegmentId to this segmentId (shows loading state).
        setTranscribingSegmentId(segmentId);
        setError({ segmentId: null, message: "" });

        try {
            // Step 2 — Must ensure transcript document exists before triggering.
            // If this fails, the job would have nothing to write results into.
            const ensureRes = await conversationServices.ensureTranscript({
                conversationId: conversation?._id,
                workspaceId
            });

            if (!ensureRes || !ensureRes.success) {
                setError({ segmentId, message: "Transcription failed. Please try again." });
                setTranscribingSegmentId(null);
                return;
            }

            // Step 3 — Call conversationServices.triggerTranscription(...)
            const triggerRes = await conversationServices.triggerTranscription({
                conversationId: conversation?._id,
                workspaceId
            });

            if (!triggerRes || !triggerRes.success) {
                setError({ segmentId, message: "Transcription failed. Please try again." });
                setTranscribingSegmentId(null);
                return;
            }

            // Setting status to 'processing' here activates the polling
            // useEffect in RecordingExperience which polls every 3s until completed/failed.
            setConversation({ ...conversation, status: "processing" });

        } catch (err) {
            console.error("[TranscriptCard] onTranscribeClick failed:", err);
            setError({ segmentId, message: "Transcription failed. Please try again." });
            setTranscribingSegmentId(null);
        }
    };

    // ADD SOURCE — handleFileUpload function
    const handleFileUpload = async (file) => {
        if (isUploading) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("conversationId", conversation?._id);
            formData.append("workspaceId", workspaceId);

            const { data } = await apiInstance.post("/uploads/audio", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (!data.success) throw new Error("Upload failed");
            const fileUrl = data.fileUrl;

            const appendData = {
                conversationId: conversation?._id,
                workspaceId,
                fileUrl,
                duration: 0,       // unknown for uploaded files — send 0
                startTime: 0,
                endTime: 0,
            };
            const res = await conversationServices.appendSegment(appendData);
            if (!res.success) throw new Error(res.error || "Failed to append segment.");

            // Refresh fetches the newly appended segment so it appears 
            // in the card list immediately without manual reload.
            await getConversationRef.current({  
                conversationId: conversation?._id,
                workspaceId,
            });

        } catch (err) {
            setUploadError("Upload failed. Please try again.");
            console.error("[TranscriptCard] handleFileUpload failed:", err);
        } finally {
            setIsUploading(false);
        }
    };

    // ADD SOURCE — handleFileSelect function
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadError(null); // Clear uploadError when a new file selection begins.

        // Validate MIME type strictly
        if (!file.type.startsWith("audio/")) {
            setUploadError("Only audio files are supported.");
            e.target.value = "";
            return;
        }

        // Validate file size: max 200MB
        const MAX_SIZE = 200 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            setUploadError("File is too large. Maximum size is 200MB.");
            e.target.value = "";
            return;
        }

        handleFileUpload(file);
        e.target.value = ""; // Always reset input value after processing
    };

    if (!segments || segments.length === 0) {
        return null;
    }

    const isActionsDisabled = isRecording || isUploading || transcribingSegmentId !== null || isProcessing;

    return (
        <div className="flex flex-col gap-3 py-4">
            {segments.map((segment, index) => {
                const title = segment.name || conversation?.title || (index === 0 ? "[Untitled]" : `[Untitled - ${index + 1}]`);
                
                // Determine if this segment has blocks.
                const segmentBlocks = transcript?.blocks?.filter(b => 
                    (b.segmentId === segment._id || !b.segmentId) && b.isActive && !b.isDeleted
                ) || [];
                
                const hasBlocks = segmentBlocks.length > 0;
                const isSegmentCompleted = isCompleted && hasBlocks;
                const isThisSegmentTranscribing = transcribingSegmentId === segment._id;
                const isDisabled = (transcribingSegmentId !== null && !isThisSegmentTranscribing) || (isProcessing && !isThisSegmentTranscribing);
                const hasError = error.segmentId === segment._id;

                // Figma: Duration | Recorded X mins ago
                // For now matching the format as closely as possible
                const statusLabel = isThisSegmentTranscribing
                    ? `${formatMs(segment.duration * 1000)} | Processing...`
                    : isSegmentCompleted
                        ? `${formatMs(segment.duration * 1000)} | Transcribed`
                        : `${formatMs(segment.duration * 1000)} | Recorded just now`;

                return (
                    <div 
                        key={segment._id}
                        className={`mx-auto w-full max-w-3xl rounded-xl bg-white shadow-sm border border-gray-100 transition-all ${isThisSegmentTranscribing ? 'opacity-80 pointer-events-none' : ''}`}
                    >
                        {/* Card Header */}
                        <div className="flex items-center justify-between px-5 py-4">
                            <div className="flex items-center gap-3">
                                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                                <div>
                                    <div className="text-[14px] font-semibold text-gray-900 leading-tight">{title}</div>
                                    <div className="text-[12px] text-gray-400 mt-1">{statusLabel}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {!isSegmentCompleted && (
                                    <button 
                                        className={`text-[14px] font-semibold transition-colors
                                            ${isThisSegmentTranscribing ? 'text-gray-400' : isDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-700'}`}
                                        disabled={isThisSegmentTranscribing || isDisabled}
                                        onClick={() => onTranscribeClick(segment._id)}
                                        title={isDisabled ? "Another transcription is in progress" : ""}
                                    >
                                        {isThisSegmentTranscribing ? (
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                <span>Transcribing...</span>
                                            </div>
                                        ) : (
                                            "Transcribe"
                                        )}
                                    </button>
                                )}
                                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <MoreHorizontal className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Error Message Row */}
                        {hasError && (
                            <div className="px-5 py-2 bg-red-50 border-t border-red-100 flex items-center justify-between">
                                <span className="text-[11px] text-red-600 font-medium">{error.message}</span>
                                <button 
                                    onClick={() => onTranscribeClick(segment._id)}
                                    className="text-[11px] text-red-700 font-bold hover:underline"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {/* Card Body - Only shown if it has blocks and not transcribing */}
                        {hasBlocks && !isThisSegmentTranscribing && (
                            <div className="px-5 pb-5 pt-0 border-t border-gray-50 mt-1">
                                <div className="flex flex-col gap-1 mt-4">
                                    {segmentBlocks.map((block) => (
                                        <div key={block._id} className="group flex gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
                                            <span className="mt-0.5 shrink-0 text-[11px] font-mono text-gray-300 group-hover:text-gray-400 w-12 text-right">
                                                {formatMs(block.startTimeMs).split(':').slice(1).join(':')}
                                            </span>
                                            <p className="text-sm leading-relaxed text-gray-800">
                                                {block.text}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Transcribing Body */}
                        {isThisSegmentTranscribing && (
                            <div className="px-5 py-12 border-t border-gray-50 flex flex-col items-center justify-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400 mb-4 shadow-sm">
                                    <Loader2 className="h-8 w-8 text-white animate-spin" strokeWidth={2} />
                                </div>
                                <p className="max-w-sm text-center text-xs leading-relaxed text-gray-500">
                                    Processing your recording. This may take a moment...
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Action Buttons Row */}
            <div className="mx-auto w-full max-w-3xl flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-6 px-1">
                    <button 
                        disabled={isActionsDisabled}
                        onClick={() => {
                            if (isRecording) return;
                            startRecording();
                        }}
                        className="flex items-center gap-2 text-[14px] font-semibold text-gray-800 hover:text-black disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-colors"
                    >
                        <img src="/mic.svg" className="h-4 w-4" alt="mic" />
                        Add recording
                    </button>
                    <button 
                        disabled={isActionsDisabled}
                        onClick={() => fileInputRef.current.click()}
                        className="flex items-center gap-2 text-[14px] font-semibold text-gray-800 hover:text-black disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-colors"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="animate-spin h-3.5 w-3.5 text-gray-500" />
                                <span className="text-gray-500">Uploading...</span>
                            </>
                        ) : (
                            <>
                                <img src="/upload-media.png" className="h-4 w-4" alt="upload" />
                                Add source
                            </>
                        )}
                    </button>
                </div>

                {/* Upload Error Message Row */}
                {uploadError && (
                    <div className="px-5 py-2 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between mt-2">
                        <span className="text-[11px] text-red-600 font-medium">{uploadError}</span>
                        <button 
                            onClick={() => fileInputRef.current.click()}
                            className="text-[11px] text-red-700 font-bold hover:underline"
                        >
                            Retry
                        </button>
                    </div>
                )}
            </div>

            {/* Hidden File Input */}
            <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="audio/*"
                className="hidden"
            />
        </div>
    );
};

export default TranscriptCard;
