"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  FileText,
  Loader2,
  Play,
  Copy,
} from "lucide-react";
import useConversationStore from "../../../../../store/conversation.store";
import { conversationServices } from "../../../../../services/conversationServices";
import { workspaceId, userId } from "../../../../../utils/conversation.utils";
import apiInstance from "../../../../../config/apiInstance";
import useGetConversation from "../../../../../hooks/use-get-conversation";
import { useRecordingStore } from "../../../../../store/recording.store";
import {
  BlockActionsMenu,
  AddTagPopover,
  TranscriptBlockTextEditor,
  SpeakerLabel,
} from "./transcript-card-ui-components";
import Image from "next/image";

const formatMs = (ms) => {
  if (!ms && ms !== 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

const blockHasTimestamp = (block) => {
  if (block?.isManual === true) return false;
  return (
    block?.startTimeMs != null &&
    block?.startTimeMs !== undefined &&
    !Number.isNaN(Number(block.startTimeMs))
  );
};

const getTimeAgo = (dateString) => {
  if (!dateString) return "Recording in-progress";
  const diffMins = Math.floor((Date.now() - new Date(dateString)) / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  const h = Math.floor(diffMins / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  return `${Math.floor(h / 24)} days ago`;
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
  const [savingBlockId, setSavingBlockId] = useState(null);
  const [blockEditError, setBlockEditError] = useState({
    blockId: null,
    message: "",
  });
  const [menuState, setMenuState] = useState({
    anchorEl: null,
    blockId: null,
    speakerKey: null,
    blockTime: "00:00",
  });
  const [tagPopoverState, setTagPopoverState] = useState({
    anchorEl: null,
    blockId: null,
    speakerKey: null,
    blockTime: "00:00",
  });
  const [blockToFocusId, setBlockToFocusId] = useState(null);
  const [addingBlock, setAddingBlock] = useState(false);
  const [deletingBlock, setDeletingBlock] = useState(false);
  const [togglingBlockActive, setTogglingBlockActive] = useState(false);

  const fileInputRef = useRef(null);
  const getConversationRef = useRef(getConversation);
  const audioPlayerRef = useRef(null);
  const stopPlaybackTimerRef = useRef(null);

  const isProcessing = conversation?.status === "processing";

  useEffect(() => {
    getConversationRef.current = getConversation;
  });

  useEffect(() => {
    if (!blockToFocusId) return;
    const t = setTimeout(() => setBlockToFocusId(null), 150);
    return () => clearTimeout(t);
  }, [blockToFocusId]);

  const toggleExpanded = (segmentId) => {
    setExpandedSegments((prev) => ({ ...prev, [segmentId]: !prev[segmentId] }));
  };

  // Build speaker lookup: speakerId string → speaker object
  const speakerLookup = useMemo(() => {
    const map = {};
    (transcript?.speakers || []).forEach((s) => {
      map[s._id.toString()] = {
        ...s,
        name: s.name,
        avatarEmoji: s.avatarEmoji || "🎙️",
      };
    });
    return map;
  }, [transcript?.speakers]);

  const transcriptTagLookup = useMemo(() => {
    const map = {};
    (transcript?.tags || []).forEach((tag) => {
      map[tag._id.toString()] = {
        id: tag._id.toString(),
        label: tag.name,
        type: tag.name?.toLowerCase() === "ask" ? "ask" : "recheck",
      };
    });
    return map;
  }, [transcript?.tags]);

  const segmentLookup = useMemo(() => {
    const map = {};
    (segments || []).forEach((segment) => {
      map[segment._id.toString()] = segment;
    });
    return map;
  }, [segments]);

  const clearBlockEditError = () =>
    setBlockEditError({ blockId: null, message: "" });

  const handleSpeakerSaved = async () => {
    if (!conversation?._id) return;
    await getConversationRef.current({
      conversationId: conversation._id,
      workspaceId,
    });
  };

  const patchTranscriptBlock = async (block, fields) => {
    if (!transcript?._id || !conversation?._id || isProcessing) return false;
    if (block?.isActive === false) return false;
    setSavingBlockId(block._id.toString());
    clearBlockEditError();
    try {
      const res = await conversationServices.updateTranscriptBlock({
        transcriptId: transcript._id,
        workspaceId,
        blockId: block._id,
        ...fields,
      });
      if (!res?.success) {
        setBlockEditError({
          blockId: block._id.toString(),
          message: res?.error || "Could not update block",
        });
        return false;
      }
      await getConversationRef.current({
        conversationId: conversation._id,
        workspaceId,
      });
      return true;
    } finally {
      setSavingBlockId(null);
    }
  };

  const handleOpenMenu = (event, { blockId, speakerKey, blockTime }) => {
    setMenuState({
      anchorEl: event.currentTarget,
      blockId,
      speakerKey,
      blockTime,
    });
  };

  const closeMenu = () => {
    setMenuState({
      anchorEl: null,
      blockId: null,
      speakerKey: null,
      blockTime: "00:00",
    });
  };

  const handleToggleBlockActiveFromMenu = async () => {
    const blockId = menuState.blockId;
    const target =
      blockId && transcript?.blocks
        ? transcript.blocks.find((b) => b._id.toString() === blockId)
        : null;
    const nextIsActive = target?.isActive === false;
    closeMenu();
    if (
      !blockId ||
      !target ||
      !transcript?._id ||
      !conversation?._id ||
      isProcessing
    ) {
      return;
    }
    setTogglingBlockActive(true);
    clearBlockEditError();
    try {
      const res = await conversationServices.toggleTranscriptBlockActive({
        transcriptId: transcript._id,
        workspaceId,
        blockId,
        isActive: nextIsActive,
      });
      if (!res?.success) {
        setBlockEditError({
          blockId,
          message: res?.error || "Could not update block",
        });
        return;
      }
      await getConversationRef.current({
        conversationId: conversation._id,
        workspaceId,
      });
    } finally {
      setTogglingBlockActive(false);
    }
  };

  const handleDeleteBlockFromMenu = async () => {
    const blockId = menuState.blockId;
    closeMenu();
    if (!blockId || !transcript?._id || !conversation?._id || isProcessing) {
      return;
    }
    setDeletingBlock(true);
    clearBlockEditError();
    try {
      const res = await conversationServices.deleteTranscriptBlock({
        transcriptId: transcript._id,
        workspaceId,
        blockId,
      });
      if (!res?.success) {
        setBlockEditError({
          blockId,
          message: res?.error || "Could not delete block",
        });
        return;
      }
      await getConversationRef.current({
        conversationId: conversation._id,
        workspaceId,
      });
    } finally {
      setDeletingBlock(false);
    }
  };

  const handleAddBlockFromMenu = async () => {
    const afterBlockId = menuState.blockId;
    closeMenu();
    if (
      !afterBlockId ||
      !transcript?._id ||
      !conversation?._id ||
      isProcessing
    ) {
      return;
    }
    setAddingBlock(true);
    try {
      const res = await conversationServices.addTranscriptBlock({
        transcriptId: transcript._id,
        workspaceId,
        afterBlockId,
      });
      if (!res?.success) return;
      const payload = res?.data;
      const created = payload?.block ?? (payload?._id ? payload : null);
      const newId = created?._id?.toString?.() ?? null;
      await getConversationRef.current({
        conversationId: conversation._id,
        workspaceId,
      });
      if (newId) setBlockToFocusId(newId);
    } finally {
      setAddingBlock(false);
    }
  };

  const openAddTagFromMenu = () => {
    setTagPopoverState({
      anchorEl: menuState.anchorEl,
      blockId: menuState.blockId,
      speakerKey: menuState.speakerKey,
      blockTime: menuState.blockTime,
    });
    closeMenu();
  };

  const closeTagPopover = () => {
    setTagPopoverState({
      anchorEl: null,
      blockId: null,
      speakerKey: null,
      blockTime: "00:00",
    });
  };

  const saveTagForSpeaker = async (label) => {
    const normalized = label.trim();
    if (!normalized || !tagPopoverState.blockId || !transcript?._id) return;

    const allTagsRes = await conversationServices.getAllTags(userId);
    const allTags = allTagsRes?.data?.tags || [];

    let selectedTag =
      allTags.find(
        (tag) => tag?.name?.trim().toLowerCase() === normalized.toLowerCase(),
      ) || null;

    if (!selectedTag) {
      const createRes = await conversationServices.createTag({
        userId,
        name: normalized,
      });
      selectedTag = createRes?.data?.tag || null;
    }

    if (!selectedTag?._id) return;

    await conversationServices.addTagToBlock({
      transcriptId: transcript._id,
      workspaceId,
      blockId: tagPopoverState.blockId,
      tagId: selectedTag._id,
    });

    await getConversationRef.current({
      conversationId: conversation?._id,
      workspaceId,
    });
  };

  const handlePlayBlock = (block) => {
    if (block?.isActive === false) return;
    const segmentId = block?.segmentId?.toString();
    if (!segmentId) return;

    const segment = segmentLookup[segmentId];
    const fileUrl = segment?.fileUrl;
    if (!fileUrl) return;

    const segmentStartSec = Number(segment?.startTime || 0);
    const blockStartSec = Number(block?.startTimeMs || 0) / 1000;
    const blockEndSec = Number(block?.endTimeMs || 0) / 1000;
    const startFrom = Math.max(0, blockStartSec - segmentStartSec);
    const stopAt = Math.max(startFrom, blockEndSec - segmentStartSec);

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(fileUrl);
    }

    const player = audioPlayerRef.current;

    if (player.src !== fileUrl) {
      player.pause();
      player.src = fileUrl;
      player.load();
    }

    if (stopPlaybackTimerRef.current) {
      clearTimeout(stopPlaybackTimerRef.current);
      stopPlaybackTimerRef.current = null;
    }

    const playFromTime = () => {
      try {
        player.currentTime = startFrom;
      } catch {}
      player.play().catch(() => {});

      const durationMs = Math.max(0, (stopAt - startFrom) * 1000);
      if (durationMs > 0) {
        stopPlaybackTimerRef.current = setTimeout(() => {
          player.pause();
        }, durationMs);
      }
    };

    if (player.readyState >= 1) {
      playFromTime();
      return;
    }

    const onLoadedMetadata = () => {
      player.removeEventListener("loadedmetadata", onLoadedMetadata);
      playFromTime();
    };
    player.addEventListener("loadedmetadata", onLoadedMetadata);
  };

  useEffect(() => {
    return () => {
      if (stopPlaybackTimerRef.current) {
        clearTimeout(stopPlaybackTimerRef.current);
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  const onTranscribeClick = async (segmentId) => {
    if (transcribingSegmentId !== null || isProcessing) return;
    setTranscribingSegmentId(segmentId);
    setError({ segmentId: null, message: "" });

    try {
      const ensureRes = await conversationServices.ensureTranscript({
        conversationId: conversation?._id,
        workspaceId,
      });
      if (!ensureRes?.success) {
        setError({
          segmentId,
          message: "Transcription failed. Please try again.",
        });
        return;
      }

      const triggerRes = await conversationServices.triggerTranscription({
        conversationId: conversation?._id,
        workspaceId,
        segmentId,
      });
      if (!triggerRes?.success) {
        setError({
          segmentId,
          message: "Transcription failed. Please try again.",
        });
        return;
      }

      await getConversationRef.current({
        conversationId: conversation?._id,
        workspaceId,
        silent: true,
      });

      setExpandedSegments((prev) => ({ ...prev, [segmentId]: true }));
    } catch (err) {
      setError({
        segmentId,
        message: "Transcription failed. Please try again.",
      });
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
      if (!res.success)
        throw new Error(res.error || "Failed to append segment.");

      await getConversationRef.current({
        conversationId: conversation?._id,
        workspaceId,
        silent: true,
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

  const menuTargetBlock =
    menuState.blockId && transcript?.blocks
      ? transcript.blocks.find((b) => b._id.toString() === menuState.blockId)
      : null;
  const manualBlockMenuOnly = menuTargetBlock?.isManual === true;
  const targetMenuBlockIsActive = menuTargetBlock?.isActive !== false;

  if (!segments || segments.length === 0) return null;

  const isActionsDisabled =
    isRecording ||
    isUploading ||
    transcribingSegmentId !== null ||
    isProcessing;

  return (
    <div className="flex flex-col gap-3 py-2 mx-auto w-full max-w-3xl">
      {segments.map((segment, index) => {
        const title =
          segment.name ||
          (index === 0 ? "[Untitled]" : `[Untitled - ${index + 1}]`);

        const segmentBlocks = (transcript?.blocks || []).filter((b) => {
          if (b.isDeleted) return false;
          if (b.segmentId)
            return b.segmentId.toString() === segment._id.toString();
          return index === 0;
        });
        const hasBlocks = segmentBlocks.length > 0;
        const sectionSpeakers = Array.from(
          new Set(
            segmentBlocks.map((b) => b.speakerId?.toString()).filter(Boolean),
          ),
        )
          .map((speakerId) => {
            const resolved = speakerLookup[speakerId];
            if (!resolved) return null;
            return {
              _id: resolved._id?.toString() || speakerId,
              name: resolved.name || "Speaker",
              avatarEmoji: resolved.avatarEmoji || "🎙️",
            };
          })
          .filter(Boolean);

        const isSegmentCompleted = hasBlocks;
        const isThisSegmentTranscribing = transcribingSegmentId === segment._id;
        const isDisabled =
          (transcribingSegmentId !== null && !isThisSegmentTranscribing) ||
          (isProcessing && !isThisSegmentTranscribing);
        const hasError = error.segmentId === segment._id;

        const statusLabel = isThisSegmentTranscribing
          ? "Transcribing..."
          : isSegmentCompleted
            ? "Transcribed"
            : segment.createdAt
              ? `Recorded ${getTimeAgo(segment.createdAt)}`
              : "Recording in-progress";

        return (
          <div
            key={segment._id}
            className={`flex flex-col rounded-lg bg-card transition-colors ${isThisSegmentTranscribing ? "opacity-80" : ""}`}
          >
            {/* Segment Header */}
            <div className="flex items-start gap-2 px-3 py-3">
              <button
                onClick={() => toggleExpanded(segment._id)}
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${expandedSegments[segment._id] ? "rotate-0" : "-rotate-90"}`}
                />
              </button>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">
                  {title}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatMs(segment.duration * 1000)}</span>
                  <span>|</span>
                  <span>{statusLabel}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isSegmentCompleted && (
                  <button
                    className={`text-sm font-medium transition-colors ${isThisSegmentTranscribing ? "text-muted-foreground cursor-default" : isDisabled ? "text-muted-foreground/40 cursor-not-allowed" : "text-primary hover:underline"}`}
                    disabled={isThisSegmentTranscribing || isDisabled}
                    onClick={() => onTranscribeClick(segment._id)}
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
                <button className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {hasError && (
              <div className="px-5 py-2 bg-red-50 border-red-100 flex items-center justify-between">
                <span className="text-[11px] text-red-600 font-medium">
                  {error.message}
                </span>
                <button
                  onClick={() => onTranscribeClick(segment._id)}
                  className="text-[11px] text-red-700 font-bold hover:underline"
                >
                  Retry
                </button>
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
                    <p className="text-center text-xs text-gray-500">
                      Processing your recording...
                    </p>
                  </div>
                ) : hasBlocks ? (
                  /* Speaker-grouped blocks */
                  <div className="flex flex-col">
                    {segmentBlocks.map((block) => {
                      const blockActive = block.isActive !== false;
                      const effectiveSpeakerId =
                        block.speakerId?.toString() || null;
                      const speaker = effectiveSpeakerId
                        ? speakerLookup[effectiveSpeakerId]
                        : null;
                      const speakerKey =
                        effectiveSpeakerId ||
                        `unassigned-${block._id.toString()}`;
                      const showTimestamp = blockHasTimestamp(block);
                      const tags = (block.tagIds || [])
                        .map(
                          (tagId) =>
                            transcriptTagLookup[tagId?.toString?.() || tagId],
                        )
                        .filter(Boolean);

                      return (
                        <div
                          key={block._id}
                          className={`flex gap-3 px-3 py-3 hover:bg-accent/30 rounded-lg transition-colors group ${!blockActive ? "opacity-50" : ""}`}
                          data-block-disabled={!blockActive || undefined}
                        >
                          {/* Timestamp or manual-block indicator */}
                          <div className="shrink-0 w-12 flex items-start justify-end pt-0.5">
                            {showTimestamp ? (
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {formatMs(block.startTimeMs)}
                              </span>
                            ) : (
                              <Image
                                src="/logout-arrow.svg"
                                alt="manual-block"
                                width={16}
                                height={16}
                              />
                            )}
                          </div>

                          {/* Speaker avatar + content */}
                          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                            {/* Speaker row */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {/* Emoji avatar */}
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-sm">
                                  {speaker?.avatarEmoji || "😀"}
                                </div>

                                <SpeakerLabel
                                  speaker={speaker}
                                  sectionSpeakers={sectionSpeakers}
                                  transcriptId={transcript?._id}
                                  workspaceId={workspaceId}
                                  blockId={block._id}
                                  onSaved={handleSpeakerSaved}
                                  disabled={isProcessing || !blockActive}
                                />

                                {!blockActive && (
                                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground shrink-0">
                                    Disabled
                                  </span>
                                )}

                                {tags.map((tagItem) => (
                                  <span
                                    key={tagItem.id}
                                    className={`inline-flex h-6 items-center rounded-full px-2 text-xs ${
                                      tagItem.type === "ask"
                                        ? "bg-[#FFF2D8] border border-[#F1B84A] text-[#B87400]"
                                        : "bg-[#EAF1FF] border border-[#5E8BFF] text-[#2F68FF]"
                                    }`}
                                  >
                                    {tagItem.label}
                                  </span>
                                ))}
                              </div>

                              <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                {showTimestamp && (
                                  <button
                                    type="button"
                                    disabled={!blockActive}
                                    onClick={() => handlePlayBlock(block)}
                                    className="h-7 w-7 rounded-full bg-[#1C1C92] text-white flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                                  >
                                    <Play size={14} fill="currentColor" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={!blockActive}
                                  onClick={() =>
                                    navigator?.clipboard?.writeText(
                                      block.text || "",
                                    )
                                  }
                                  className="h-7 w-7 cursor-pointer rounded border border-[#D0D0D0] text-[#6A6A6A] flex items-center justify-center bg-white disabled:opacity-40 disabled:pointer-events-none"
                                >
                                  <Copy size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) =>
                                    handleOpenMenu(event, {
                                      blockId: block._id.toString(),
                                      speakerKey,
                                      blockTime: showTimestamp
                                        ? formatMs(block.startTimeMs)
                                        : "—",
                                    })
                                  }
                                  className="h-7 w-7 cursor-pointer rounded-full text-[#666] flex items-center justify-center hover:bg-[#EFEFEF]"
                                >
                                  <MoreHorizontal size={16} />
                                </button>
                              </div>
                            </div>

                            {blockEditError.blockId ===
                              block._id.toString() && (
                              <p className="pl-8 text-[11px] text-red-600">
                                {blockEditError.message}
                              </p>
                            )}
                            <TranscriptBlockTextEditor
                              text={block.text}
                              disabled={isProcessing || !blockActive}
                              saving={savingBlockId === block._id.toString()}
                              autoStartEditing={
                                blockToFocusId === block._id.toString()
                              }
                              emptyPlaceholder="[Add text here]"
                              onCommit={async (payload) => {
                                if (payload?.empty) {
                                  setBlockEditError({
                                    blockId: block._id.toString(),
                                    message: "Text cannot be empty",
                                  });
                                  return false;
                                }
                                return patchTranscriptBlock(block, {
                                  text: payload.text,
                                });
                              }}
                            />
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
            onClick={() => {
              if (!isRecording) startRecording();
            }}
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

        {uploadError && (
          <div className="px-5 py-2 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between mt-2">
            <span className="text-[11px] text-red-600 font-medium">
              {uploadError}
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] text-red-700 font-bold hover:underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="audio/*"
        className="hidden"
      />
      <BlockActionsMenu
        anchorEl={menuState.anchorEl}
        open={Boolean(menuState.anchorEl)}
        onClose={closeMenu}
        onAddTag={openAddTagFromMenu}
        onAddBlock={handleAddBlockFromMenu}
        addBlockDisabled={isProcessing || addingBlock}
        addTagDisabled={isProcessing}
        onDeleteBlock={handleDeleteBlockFromMenu}
        deleteBlockDisabled={isProcessing || deletingBlock}
        onToggleBlockActive={handleToggleBlockActiveFromMenu}
        toggleBlockActiveDisabled={
          isProcessing || togglingBlockActive || !menuTargetBlock
        }
        targetBlockIsActive={targetMenuBlockIsActive}
        manualBlockMenuOnly={manualBlockMenuOnly}
      />
      <AddTagPopover
        anchorEl={tagPopoverState.anchorEl}
        open={Boolean(tagPopoverState.anchorEl)}
        onClose={closeTagPopover}
        blockTime={tagPopoverState.blockTime}
        existingTags={
          tagPopoverState.blockId
            ? (
                transcript?.blocks?.find(
                  (b) => b._id.toString() === tagPopoverState.blockId,
                )?.tagIds || []
              )
                .map(
                  (tagId) => transcriptTagLookup[tagId?.toString?.() || tagId],
                )
                .filter(Boolean)
            : []
        }
        onSaveTag={saveTagForSpeaker}
      />
    </div>
  );
};

export default TranscriptCard;
