'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, MoreHorizontal, FileText, Loader2 } from 'lucide-react';
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

const getTimeAgo = (dateString) => {
    const now = new Date();
    const then = new Date(dateString);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins === 1) return "1 min ago";
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
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
    const [expandedSegments, setExpandedSegments] = useState({});

    const fileInputRef = useRef(null);
    const getConversationRef = useRef(getConversation);

    const isProcessing = conversation?.status === "processing";
    const isCompleted = conversation?.status === "completed";

    const toggleExpanded = (segmentId) => {
        setExpandedSegments(prev => ({
            ...prev,
            [segmentId]: !prev[segmentId],
        }));
    };

    // Sync getConversationRef to avoid stale closures in async handlers
    useEffect(() => { 
        getConversationRef.current = getConversation; 
    });


    // TRANSCRIBE BUTTON CLICK HANDLER
    const onTranscribeClick = async (segmentId) => {
        if (transcribingSegmentId !== null || isProcessing) return;

        setTranscribingSegmentId(segmentId);
        setError({ segmentId: null, message: "" });

        try {
            // Step 1 — Ensure transcript document exists
            const ensureRes = await conversationServices.ensureTranscript({
                conversationId: conversation?._id,
                workspaceId
            });
            if (!ensureRes?.success) {
                setError({ segmentId, message: "Transcription failed. Please try again." });
                setTranscribingSegmentId(null);
                return;
            }

            // Step 2 — Trigger transcription and WAIT for it to complete
            // Backend now transcribes synchronously — this call resolves only when done
            const triggerRes = await conversationServices.triggerTranscription({
                conversationId: conversation?._id,
                workspaceId,
                segmentId,
            });

            if (!triggerRes?.success) {
                setError({ segmentId, message: "Transcription failed. Please try again." });
                setTranscribingSegmentId(null);
                return;
            }

            // Step 3 — Fetch updated conversation to get new transcript blocks
            // No polling needed — transcription is already complete at this point
            await getConversationRef.current({
                conversationId: conversation?._id,
                workspaceId,
                silent: true,
            });

            // Auto-expand the transcribed segment so user sees the result immediately
            setExpandedSegments(prev => ({
                ...prev,
                [segmentId]: true,
            }));

        } catch (err) {
            console.error("[TranscriptCard] onTranscribeClick failed:", err);
            setError({ segmentId, message: "Transcription failed. Please try again." });
        } finally {
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
                silent: true,
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
        <div className="flex flex-col gap-3 py-2 mx-auto w-full max-w-3xl">
            {segments.map((segment, index) => {
                const title = segment.name || conversation?.title || (index === 0 ? "[Untitled]" : `[Untitled - ${index + 1}]`);
                
                // Determine if this segment has blocks.
                // Block-to-segment association:
                // - Blocks with segmentId: matched exactly to their source segment.
                // - Blocks without segmentId (legacy): shown under first segment only.
                // - String comparison used because API returns ObjectIds as strings.
                const segmentBlocks = transcript?.blocks?.filter(b => {
                    // Exclude inactive or deleted blocks always.
                    if (!b.isActive || b.isDeleted) return false;

                    // If block has a segmentId, it must match this segment exactly.
                    // String comparison is required because MongoDB ObjectIds from the 
                    // API response are strings, not ObjectId instances, on the frontend.
                    if (b.segmentId) {
                        return b.segmentId.toString() === segment._id.toString();
                    }

                    // Legacy blocks (created before segmentId was added to the schema)
                    // have no segmentId. Show them only under the first segment (index === 0)
                    // to avoid duplicating them across all segment cards.
                    return index === 0;
                }) || [];
                
                const hasBlocks = segmentBlocks.length > 0;
                // A segment is completed if it has its own blocks — regardless of 
                // the overall conversation status. This correctly handles multi-segment 
                // conversations where segments are transcribed independently.
                const isSegmentCompleted = hasBlocks;
                const isThisSegmentTranscribing = transcribingSegmentId === segment._id;
                const isDisabled = (transcribingSegmentId !== null && !isThisSegmentTranscribing) || (isProcessing && !isThisSegmentTranscribing);
                const hasError = error.segmentId === segment._id;

                const recordedLabel = isThisSegmentTranscribing
                    ? "Transcribing — this may take a moment for large files..."
                    : isSegmentCompleted
                        ? "Transcribed"
                        : segment.recordedAt
                            ? `Recorded ${getTimeAgo(segment.recordedAt)}`
                            : "Recording in-progress";

                return (
                    <div 
                        key={segment._id}
                        className={`group flex flex-col rounded-lg  bg-card transition-colors hover:bg-accent/40 ${isThisSegmentTranscribing ? 'opacity-80' : ''}`}
                    >
                        {/* Card Header */}
                        <div className="flex items-start gap-2 px-3 py-3">
                            {/* Chevron — functional expand/collapse */}
                            <button
                                onClick={() => toggleExpanded(segment._id)}
                                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                                aria-label={expandedSegments[segment._id] ? "Collapse" : "Expand"}
                            >
                                <ChevronDown
                                    className={`h-4 w-4 transition-transform duration-200 ${expandedSegments[segment._id] ? 'rotate-0' : '-rotate-90'}`}
                                />
                            </button>

                            {/* Title + status */}
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-foreground">{title}</div>
                                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{formatMs(segment.duration * 1000)}</span>
                                    <span className="text-border">|</span>
                                    <span>{recordedLabel}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3">
                                {!isSegmentCompleted && (
                                    <button
                                        className={`text-sm font-medium transition-colors ${isThisSegmentTranscribing ? 'text-muted-foreground cursor-default' : isDisabled ? 'text-muted-foreground/40 cursor-not-allowed' : 'text-primary hover:underline'}`}
                                        disabled={isThisSegmentTranscribing || isDisabled}
                                        onClick={() => onTranscribeClick(segment._id)}
                                        title={isDisabled ? "Another transcription is in progress" : ""}
                                    >
                                        {isThisSegmentTranscribing ? (
                                            <div className="flex items-center gap-1.5">
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                <span>Transcribing...</span>
                                            </div>
                                        ) : (
                                            "Transcribe"
                                        )}
                                    </button>
                                )}
                                <button
                                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                                    aria-label="More options"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Error Message Row - Always visible regardless of expanded state */}
                        {hasError && (
                            <div className="px-5 py-2 bg-red-50  border-red-100 flex items-center justify-between">
                                <span className="text-[11px] text-red-600 font-medium">{error.message}</span>
                                <button 
                                    onClick={() => onTranscribeClick(segment._id)}
                                    className="text-[11px] text-red-700 font-bold hover:underline"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {/* Card Body - Only shown if expanded */}
                        {expandedSegments[segment._id] && (
                            <div className="">
                                {isThisSegmentTranscribing ? (
                                    /* Processing empty state */
                                    <div className="px-5 py-12 flex flex-col items-center justify-center">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400 mb-4 shadow-sm">
                                            <Loader2 className="h-8 w-8 text-white animate-spin" strokeWidth={2} />
                                        </div>
                                        <p className="max-w-sm text-center text-xs leading-relaxed text-gray-500">
                                            Processing your recording. This may take a moment...
                                        </p>
                                    </div>
                                ) : hasBlocks ? (
                                    /* Transcript blocks */
                                    <div className="px-5 py-4">
                                        <p className="text-sm leading-relaxed text-gray-800">
                                            {segmentBlocks.map((elem) => elem.text).join(" ")}
                                        </p>
                                    </div>
                                ) : (
                                    /* Empty state — no transcript yet */
                                    <div className="flex flex-col items-center justify-center px-6 py-12">
                                        <div className="relative mb-4">
                                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                                                <FileText className="h-8 w-8 text-gray-400" strokeWidth={2} />
                                            </div>
                                        </div>
                                        <p className="max-w-sm text-center text-xs leading-relaxed text-gray-500">
                                            {isSegmentCompleted ? "No transcription data found for this segment." : "Transcript will appear here once you click Transcribe."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Action Buttons Row */}
            <div className="mx-auto w-full max-w-3xl flex flex-col gap-2 pt-3">
                <div className="flex items-center gap-6 px-1">
                    <button 
                        disabled={isActionsDisabled}
                        onClick={() => {
                            if (isRecording) return;
                            startRecording();
                        }}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-colors"
                    >
                        <img src="/mic.svg" className="h-4 w-4" alt="mic" />
                        Add recording
                    </button>
                    <button 
                        disabled={isActionsDisabled}
                        onClick={() => fileInputRef.current.click()}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-colors"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="animate-spin h-3.5 w-3.5" />
                                <span>Uploading...</span>
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
