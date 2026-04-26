'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, MoreHorizontal, FileText, Loader2, Check, X } from 'lucide-react';
import EmojiPicker from "emoji-picker-react";
import useConversationStore from '../../../../../store/conversation.store';
import { conversationServices } from '../../../../../services/conversationServices';
import { workspaceId } from '../../../../../utils/conversation.utils';
import apiInstance from '../../../../../config/apiInstance';
import useGetConversation from '../../../../../hooks/use-get-conversation';
import { useRecordingStore } from '../../../../../store/recording.store';

const formatMs = (ms) => {
    if (!ms && ms !== 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

const getTimeAgo = (dateString) => {
    if (!dateString) return "Recording in-progress";
    const diffMins = Math.floor((Date.now() - new Date(dateString)) / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    const h = Math.floor(diffMins / 60);
    if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
    return `${Math.floor(h / 24)} days ago`;
};

const AssignSpeakerModal = ({ speaker, transcriptId, onSaved, onClose }) => {
    const [name, setName] = useState(speaker?.name || "");
    const [emoji, setEmoji] = useState(speaker?.avatarEmoji || "🎙️");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [saving, setSaving] = useState(false);
    const pickerRef = useRef(null);
    const overlayRef = useRef(null);

    // Close emoji picker on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close modal on overlay click
    const handleOverlayClick = (e) => {
        if (e.target === overlayRef.current) onClose();
    };

    const handleEmojiClick = (emojiData) => {
        setEmoji(emojiData.emoji);
        setShowEmojiPicker(false);
    };

    const hasChanges = name.trim() !== speaker?.name || emoji !== speaker?.avatarEmoji;
    const canSave = name.trim().length > 0 && hasChanges && !saving;

    const handleSave = async () => {
        if (!canSave) return;
        setSaving(true);
        try {
            await conversationServices.renameSpeaker({
                transcriptId,
                workspaceId,
                speakerId: speaker._id,
                name: name.trim(),
                avatarEmoji: emoji,
            });
            onSaved(speaker._id, name.trim(), emoji);
            onClose();
        } catch (e) {
            // Keep modal open on error
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && canSave) handleSave();
        if (e.key === 'Escape') onClose();
    };

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]"
        >
            <div className="bg-white rounded-2xl shadow-xl w-[340px] p-6 flex flex-col gap-5">
                {/* Title */}
                <h3 className="text-sm font-semibold text-gray-900">Assign Speaker</h3>

                {/* Inputs row */}
                <div className="flex items-center gap-3">
                    {/* Emoji button */}
                    <div className="relative" ref={pickerRef}>
                        <button
                            onClick={() => setShowEmojiPicker(prev => !prev)}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-xl border border-gray-200"
                        >
                            {emoji}
                        </button>
                        {showEmojiPicker && (
                            <div className="absolute top-12 left-0 z-50 shadow-2xl rounded-xl overflow-hidden">
                                <EmojiPicker
                                    onEmojiClick={handleEmojiClick}
                                    height={350}
                                    width={300}
                                    searchDisabled={false}
                                    skinTonesDisabled
                                    previewConfig={{ showPreview: false }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Name input */}
                    <input
                        autoFocus
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Speaker name"
                        className="flex-1 h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-gray-50 transition-colors"
                    />
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!canSave}
                        className="px-5 py-2 rounded-xl text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SpeakerLabel = ({ speaker, transcriptId, onSaved }) => {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary transition-colors"
            >
                <span>{speaker?.name || "Unknown Speaker"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {showModal && (
                <AssignSpeakerModal
                    speaker={speaker}
                    transcriptId={transcriptId}
                    onSaved={onSaved}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
};

const TranscriptCard = () => {
    const { conversation, segments, transcript } = useConversationStore();
    const { isRecording, startRecording } = useRecordingStore();
    const { getConversation } = useGetConversation();

    const [transcribingSegmentId, setTranscribingSegmentId] = useState(null);
    const [error, setError] = useState({ segmentId: null, message: "" });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [expandedSegments, setExpandedSegments] = useState({});
    // Local speaker names cache for optimistic updates (stores {name, emoji})
    const [speakerNames, setSpeakerNames] = useState({});

    const fileInputRef = useRef(null);
    const getConversationRef = useRef(getConversation);

    const isProcessing = conversation?.status === "processing";

    useEffect(() => { getConversationRef.current = getConversation; });

    const toggleExpanded = (segmentId) => {
        setExpandedSegments(prev => ({ ...prev, [segmentId]: !prev[segmentId] }));
    };

    // Build speaker lookup: speakerId string → speaker object
    const speakerLookup = useMemo(() => {
        const map = {};
        (transcript?.speakers || []).forEach(s => {
            const override = speakerNames[s._id.toString()];
            map[s._id.toString()] = {
                ...s,
                name: override?.name || s.name,
                avatarEmoji: override?.emoji || s.avatarEmoji || "🎙️",
            };
        });
        return map;
    }, [transcript?.speakers, speakerNames]);

    const handleSpeakerSaved = (speakerId, newName, newEmoji) => {
        setSpeakerNames(prev => ({
            ...prev,
            [speakerId.toString()]: { name: newName, emoji: newEmoji }
        }));
    };

    const onTranscribeClick = async (segmentId) => {
        if (transcribingSegmentId !== null || isProcessing) return;
        setTranscribingSegmentId(segmentId);
        setError({ segmentId: null, message: "" });

        try {
            const ensureRes = await conversationServices.ensureTranscript({
                conversationId: conversation?._id, workspaceId
            });
            if (!ensureRes?.success) {
                setError({ segmentId, message: "Transcription failed. Please try again." });
                return;
            }

            const triggerRes = await conversationServices.triggerTranscription({
                conversationId: conversation?._id, workspaceId, segmentId,
            });
            if (!triggerRes?.success) {
                setError({ segmentId, message: "Transcription failed. Please try again." });
                return;
            }

            await getConversationRef.current({
                conversationId: conversation?._id, workspaceId, silent: true,
            });

            setExpandedSegments(prev => ({ ...prev, [segmentId]: true }));
        } catch (err) {
            setError({ segmentId, message: "Transcription failed. Please try again." });
        } finally {
            setTranscribingSegmentId(null);
        }
    };

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

            const res = await conversationServices.appendSegment({
                conversationId: conversation?._id,
                workspaceId,
                fileUrl: data.fileUrl,
                duration: 0,
                startTime: 0,
                endTime: 0,
            });
            if (!res.success) throw new Error(res.error || "Failed to append segment.");

            await getConversationRef.current({
                conversationId: conversation?._id, workspaceId, silent: true,
            });
        } catch (err) {
            setUploadError("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadError(null);
        if (!file.type.startsWith("audio/")) {
            setUploadError("Only audio files are supported.");
            e.target.value = "";
            return;
        }
        if (file.size > 200 * 1024 * 1024) {
            setUploadError("File is too large. Maximum size is 200MB.");
            e.target.value = "";
            return;
        }
        handleFileUpload(file);
        e.target.value = "";
    };

    if (!segments || segments.length === 0) return null;

    const isActionsDisabled = isRecording || isUploading || transcribingSegmentId !== null || isProcessing;

    return (
        <div className="flex flex-col gap-3 py-2 mx-auto w-full max-w-3xl">
            {segments.map((segment, index) => {
                const title = segment.name || (index === 0 ? "[Untitled]" : `[Untitled - ${index + 1}]`);

                const segmentBlocks = (transcript?.blocks || []).filter(b => {
                    if (!b.isActive || b.isDeleted) return false;
                    if (b.segmentId) return b.segmentId.toString() === segment._id.toString();
                    return index === 0;
                });

                const hasBlocks = segmentBlocks.length > 0;
                const isSegmentCompleted = hasBlocks;
                const isThisSegmentTranscribing = transcribingSegmentId === segment._id;
                const isDisabled = (transcribingSegmentId !== null && !isThisSegmentTranscribing) || (isProcessing && !isThisSegmentTranscribing);
                const hasError = error.segmentId === segment._id;

                const statusLabel = isThisSegmentTranscribing
                    ? "Transcribing..."
                    : isSegmentCompleted
                        ? "Transcribed"
                        : segment.createdAt
                            ? `Recorded ${getTimeAgo(segment.createdAt)}`
                            : "Recording in-progress";

                return (
                    <div key={segment._id} className={`flex flex-col rounded-lg bg-card transition-colors ${isThisSegmentTranscribing ? 'opacity-80' : ''}`}>
                        {/* Segment Header */}
                        <div className="flex items-start gap-2 px-3 py-3">
                            <button
                                onClick={() => toggleExpanded(segment._id)}
                                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                            >
                                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedSegments[segment._id] ? 'rotate-0' : '-rotate-90'}`} />
                            </button>

                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-foreground">{title}</div>
                                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{formatMs(segment.duration * 1000)}</span>
                                    <span>|</span>
                                    <span>{statusLabel}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {!isSegmentCompleted && (
                                    <button
                                        className={`text-sm font-medium transition-colors ${isThisSegmentTranscribing ? 'text-muted-foreground cursor-default' : isDisabled ? 'text-muted-foreground/40 cursor-not-allowed' : 'text-primary hover:underline'}`}
                                        disabled={isThisSegmentTranscribing || isDisabled}
                                        onClick={() => onTranscribeClick(segment._id)}
                                    >
                                        {isThisSegmentTranscribing
                                            ? <div className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /><span>Transcribing...</span></div>
                                            : "Transcribe"
                                        }
                                    </button>
                                )}
                                <button className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground">
                                    <MoreHorizontal className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {hasError && (
                            <div className="px-5 py-2 bg-red-50 border-red-100 flex items-center justify-between">
                                <span className="text-[11px] text-red-600 font-medium">{error.message}</span>
                                <button onClick={() => onTranscribeClick(segment._id)} className="text-[11px] text-red-700 font-bold hover:underline">Retry</button>
                            </div>
                        )}

                        {/* Expanded Body */}
                        {expandedSegments[segment._id] && (
                            <div className="pb-3">
                                {isThisSegmentTranscribing ? (
                                    <div className="px-5 py-12 flex flex-col items-center justify-center">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400 mb-4">
                                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                                        </div>
                                        <p className="text-center text-xs text-gray-500">Processing your recording...</p>
                                    </div>
                                ) : hasBlocks ? (
                                    /* Speaker-grouped blocks */
                                    <div className="flex flex-col">
                                        {segmentBlocks.map((block) => {
                                            const speaker = block.speakerId
                                                ? speakerLookup[block.speakerId.toString()]
                                                : null;

                                            return (
                                                <div key={block._id} className="flex gap-3 px-3 py-3 hover:bg-accent/30 rounded-lg transition-colors group">
                                                    {/* Timestamp */}
                                                    <div className="shrink-0 w-12 text-right">
                                                        <span className="text-[11px] font-mono text-muted-foreground">
                                                            {formatMs(block.startTimeMs)}
                                                        </span>
                                                    </div>

                                                    {/* Speaker avatar + content */}
                                                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                                        {/* Speaker row */}
                                                        <div className="flex items-center gap-2">
                                                            {/* Emoji avatar */}
                                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-sm">
                                                                {speaker?.avatarEmoji || "🎙️"}
                                                            </div>

                                                            {/* Inline speaker button (triggers modal) */}
                                                            {speaker ? (
                                                                <SpeakerLabel
                                                                    speaker={speaker}
                                                                    transcriptId={transcript?._id}
                                                                    onSaved={handleSpeakerSaved}
                                                                />
                                                            ) : (
                                                                <span className="text-xs font-semibold text-muted-foreground">Unknown Speaker</span>
                                                            )}
                                                        </div>

                                                        {/* Block text */}
                                                        <p className="text-sm leading-relaxed text-foreground pl-8">
                                                            {block.text}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center px-6 py-12">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
                                            <FileText className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <p className="text-center text-xs text-gray-500">
                                            Transcript will appear here once you click Transcribe.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-3">
                <div className="flex items-center gap-6 px-1">
                    <button
                        disabled={isActionsDisabled}
                        onClick={() => { if (!isRecording) startRecording(); }}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-colors"
                    >
                        <img src="/mic.svg" className="h-4 w-4" alt="mic" />
                        Add recording
                    </button>
                    <button
                        disabled={isActionsDisabled}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-colors"
                    >
                        {isUploading
                            ? <><Loader2 className="animate-spin h-3.5 w-3.5" /><span>Uploading...</span></>
                            : <><img src="/upload-media.png" className="h-4 w-4" alt="upload" />Add source</>
                        }
                    </button>
                </div>

                {uploadError && (
                    <div className="px-5 py-2 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between mt-2">
                        <span className="text-[11px] text-red-600 font-medium">{uploadError}</span>
                        <button onClick={() => fileInputRef.current?.click()} className="text-[11px] text-red-700 font-bold hover:underline">Retry</button>
                    </div>
                )}
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="audio/*" className="hidden" />
        </div>
    );
};

export default TranscriptCard;
