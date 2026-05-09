"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Diamond, GripVertical, Mic, Trash2, Send } from "lucide-react";
import useConversationStore from "@/store/conversation.store";
import { useRecordingStore } from "@/store/recording.store";
import { conversationServices } from "@/services/conversationServices";
import useGetConversation from "@/hooks/use-get-conversation";
import {
  AddTagPopover,
  BookmarkTagsHoverPopover,
} from "./transcript-card-ui-components";
import { workspaceId } from "@/utils/conversation.utils";

const formatTimer = (seconds) => {
  if (!seconds) return "00:00:00";
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
};

const generateTicks = (totalDuration, count = 11) => {
  if (!totalDuration || totalDuration <= 0) {
    return Array.from({ length: count }, (_, i) =>
      (0.31 + i * 0.054).toFixed(2),
    );
  }
  return Array.from({ length: count }, (_, i) =>
    ((totalDuration / (count - 1)) * i).toFixed(1),
  );
};

/** Bar geometry in CSS pixels (canvas scales with container × DPR) */
const BAR_W_CSS = 2;
const GAP_CSS = 0.85;

const WAVEFORM_BG = "#E3E3E4";
const BAR_FILL = "#979797";

const StaticWaveform = ({ mediaStream, pendingName, onPendingNameChange }) => {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const audioContextRef = useRef(null);
  const isPausedRef = useRef(false);
  const durationRef = useRef(0);
  const { conversation, segments } = useConversationStore();
  const playbackCurrentTime = useConversationStore((s) => s.currentTime);
  const playbackSegmentId = useConversationStore((s) => s.playbackSegmentId);
  const {
    duration,
    title,
    isPaused,
    isRecording,
    markers,
    localTagDefinitions,
  } = useRecordingStore();
  const { getConversation } = useGetConversation();

  const [activePopover, setActivePopover] = useState(null);
  const [popoverName, setPopoverName] = useState("");
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const popoverRef = useRef(null);

  // Drag reorder state
  const [orderedSegments, setOrderedSegments] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isReordering, setIsReordering] = useState(false);
  const [tagMarkerAnchor, setTagMarkerAnchor] = useState({
    markerId: null,
    el: null,
  });
  const [tagHoverAnchor, setTagHoverAnchor] = useState({
    markerId: null,
    el: null,
  });
  const tagHoverLeaveTimerRef = useRef(null);

  const clearTagHoverTimer = useCallback(() => {
    if (tagHoverLeaveTimerRef.current) {
      clearTimeout(tagHoverLeaveTimerRef.current);
      tagHoverLeaveTimerRef.current = null;
    }
  }, []);

  const scheduleTagHoverClose = useCallback(() => {
    clearTagHoverTimer();
    tagHoverLeaveTimerRef.current = window.setTimeout(() => {
      setTagHoverAnchor({ markerId: null, el: null });
    }, 140);
  }, [clearTagHoverTimer]);

  const isLive = !!(mediaStream && mediaStream.getAudioTracks().length > 0);
  const totalDuration = conversation?.totalDuration || 0;
  const playbackHeadPct =
    totalDuration > 0
      ? Math.min(100, Math.max(0, (playbackCurrentTime / totalDuration) * 100))
      : 0;
  const ticks = generateTicks(totalDuration);

  // Sync ordered segments from store
  useEffect(() => {
    if (segments?.length) {
      const sorted = [...segments].sort(
        (a, b) => (a.order || 0) - (b.order || 0),
      );
      setOrderedSegments(sorted);
    } else {
      setOrderedSegments([]);
    }
  }, [segments]);

  useEffect(() => {
    if (!isLive) {
      setTagMarkerAnchor({ markerId: null, el: null });
      setTagHoverAnchor({ markerId: null, el: null });
    }
  }, [isLive]);

  useEffect(() => () => clearTagHoverTimer(), [clearTagHoverTimer]);

  const closePopover = useCallback(() => {
    setActivePopover(null);
    setPopoverAnchor(null);
  }, []);

  useEffect(() => {
    if (!activePopover) return;
    let removeDoc = () => {};
    const rafId = requestAnimationFrame(() => {
      const handlePointerDown = (e) => {
        if (popoverRef.current?.contains(e.target)) return;
        closePopover();
      };
      document.addEventListener("pointerdown", handlePointerDown);
      removeDoc = () =>
        document.removeEventListener("pointerdown", handlePointerDown);
    });
    const handleEsc = (e) => {
      if (e.key === "Escape") closePopover();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      cancelAnimationFrame(rafId);
      removeDoc();
      window.removeEventListener("keydown", handleEsc);
    };
  }, [activePopover, closePopover]);

  const openPopover = (id, name, anchorEl) => {
    const r = anchorEl?.getBoundingClientRect?.();
    setPopoverAnchor(r ?? null);
    setActivePopover(id);
    setPopoverName(name || "");
  };

  const handleRename = async (segmentId) => {
    if (!popoverName.trim() || isRenaming) return;
    if (segmentId === "live") {
      onPendingNameChange?.(popoverName.trim());
      closePopover();
      return;
    }
    setIsRenaming(true);
    try {
      const res = await conversationServices.renameSegment({
        segmentId,
        conversationId: conversation?._id,
        workspaceId,
        name: popoverName.trim(),
      });
      if (res?.success === false) return;
      await getConversation({
        conversationId: conversation?._id,
        workspaceId,
        silent: true,
      });
      closePopover();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async (segmentId) => {
    if (segmentId === "live" || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await conversationServices.deleteSegment({
        segmentId,
        conversationId: conversation?._id,
        workspaceId,
      });
      if (res?.success === false) return;
      await getConversation({
        conversationId: conversation?._id,
        workspaceId,
        silent: true,
      });
      closePopover();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  // Live bar waveform (Figma-style gray bars; static pattern when paused)
  useEffect(() => {
    if (!isLive || !canvasRef.current) return;

    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.38;
    analyser.minDecibels = -92;
    analyser.maxDecibels = -22;

    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(analyser);

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    const parentEl = canvas.parentElement;
    const layoutRef = { cssW: 400 };

    const resizeCanvas = () => {
      if (!parentEl) return;
      const dpr = Math.min(
        2,
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      );
      const rect = parentEl.getBoundingClientRect();
      layoutRef.cssW = Math.max(1, rect.width);
      const cw = Math.max(120, Math.floor(rect.width * dpr));
      const ch = Math.max(36, Math.floor(rect.height * dpr));
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
    };
    resizeCanvas();
    const ro =
      typeof ResizeObserver !== "undefined" && parentEl
        ? new ResizeObserver(resizeCanvas)
        : null;
    ro?.observe(parentEl);

    const freqBins = analyser.frequencyBinCount;
    const freqData = new Uint8Array(freqBins);
    const timeData = new Uint8Array(analyser.fftSize);
    const sr = audioContext.sampleRate;
    const nyquist = sr / 2;
    const fMin = 45;

    const draw = () => {
      requestRef.current = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      const cssW = layoutRef.cssW;
      const barW = (BAR_W_CSS / cssW) * w;
      const gap = (GAP_CSS / cssW) * w;
      const n = Math.max(1, Math.floor((w + gap) / (barW + gap)));
      const radius = Math.min(0.85, barW * 0.35);

      canvasCtx.fillStyle = WAVEFORM_BG;
      canvasCtx.fillRect(0, 0, w, h);

      const drawBar = (x, y, bw, bh, fill) => {
        canvasCtx.fillStyle = fill;
        if (bw < 2.25) {
          canvasCtx.fillRect(Math.round(x), y, Math.max(1, bw), bh);
          return;
        }
        canvasCtx.beginPath();
        if (typeof canvasCtx.roundRect === "function") {
          canvasCtx.roundRect(x, y, bw, bh, radius);
        } else {
          canvasCtx.rect(x, y, bw, bh);
        }
        canvasCtx.fill();
      };

      if (isPausedRef.current) {
        const t = durationRef.current;
        for (let i = 0; i < n; i++) {
          const rel = (i + t) * 0.31;
          const amp =
            0.18 +
            0.62 *
              Math.abs(
                Math.sin(rel) * 0.55 + Math.sin(rel * 1.7 + t * 0.05) * 0.45,
              );
          const barH = Math.max(2, amp * h * 0.72);
          const x = i * (barW + gap);
          const y = (h - barH) / 2;
          drawBar(x, y, barW, barH, BAR_FILL);
        }
      } else {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);
        const slice = Math.max(2, Math.floor(timeData.length / n));

        for (let i = 0; i < n; i++) {
          const fLow = fMin * Math.pow(nyquist / fMin, i / n);
          const fHigh = fMin * Math.pow(nyquist / fMin, (i + 1) / n);
          const b0 = Math.max(1, Math.floor((fLow / nyquist) * freqBins));
          const b1 = Math.min(
            freqBins - 1,
            Math.ceil((fHigh / nyquist) * freqBins),
          );

          let peak = 0;
          for (let b = b0; b <= b1; b++) {
            peak = Math.max(peak, freqData[b]);
          }
          const freqNorm = peak / 255;

          let sumSq = 0;
          const off = i * slice;
          const end = Math.min(off + slice, timeData.length);
          for (let j = off; j < end; j++) {
            const v = (timeData[j] - 128) / 128;
            sumSq += v * v;
          }
          const rms = Math.sqrt(sumSq / Math.max(1, end - off));
          const timeNorm = Math.min(1, rms * 5.2);

          const mix = Math.min(1, 0.52 * freqNorm + 0.48 * timeNorm);
          const boosted = Math.pow(mix, 0.52);
          const shaped = 0.06 + 0.94 * boosted;
          const barH = Math.max(2, shaped * h * 0.8);
          const x = i * (barW + gap);
          const y = (h - barH) / 2;
          drawBar(x, y, barW, barH, BAR_FILL);
        }
      }

      /* Bookmark marker lines: DOM overlays (aligned with chip + diamonds). */
    };

    draw();

    return () => {
      ro?.disconnect();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (audioContextRef.current?.state !== "closed")
        audioContextRef.current?.close();
    };
  }, [isLive, mediaStream]);

  // Drag handlers
  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...orderedSegments];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setOrderedSegments(reordered);
    setDragIndex(null);
    setDragOverIndex(null);

    setIsReordering(true);
    try {
      const res = await conversationServices.reorderSegments({
        conversationId: conversation?._id,
        workspaceId,
        segmentIds: reordered.map((s) => s._id),
      });
      if (res?.success) {
        await getConversation({
          conversationId: conversation?._id,
          workspaceId,
          silent: true,
        });
      }
    } catch {
      const sorted = [...segments].sort(
        (a, b) => (a.order || 0) - (b.order || 0),
      );
      setOrderedSegments(sorted);
    } finally {
      setIsReordering(false);
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  /* Grow width only as duration increases — no 25% jump at start. Use 120s visual span when no timeline total. */
  const widthReferenceSec =
    totalDuration > 0 ? Math.max(totalDuration, 1) : 120;
  const chipWidthPct =
    duration > 0
      ? Math.min((duration / widthReferenceSec) * 100, 92)
      : isLive
        ? 0.35
        : 0;

  isPausedRef.current = isPaused;
  durationRef.current = duration;

  const SegmentPopover = ({ id, duration: dur, createdAt }) => {
    if (!popoverAnchor || typeof document === "undefined") return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.max(8, Math.min(popoverAnchor.left, vw - 308));
    const bottom = vh - popoverAnchor.top + 8;
    return createPortal(
      <div
        ref={popoverRef}
        className="w-[300px] rounded-xl border border-gray-200 bg-white shadow-lg"
        style={{
          position: "fixed",
          left,
          bottom,
          zIndex: 9999,
        }}
      >
        <div className="flex items-center gap-2 px-3 pb-2 pt-3">
          <Mic className="h-4 w-4 shrink-0 text-gray-500" />
          <input
            autoFocus
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-[#1C1C92] focus:ring-1 focus:ring-[#1C1C92]/20"
            value={popoverName}
            onChange={(e) => setPopoverName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename(id);
            }}
          />
        </div>
        <div className="flex items-center justify-between px-3 pb-3">
          <span className="text-xs text-gray-400">
            {formatTimer(dur)}
            {createdAt ? ` | ${createdAt}` : ""}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleDelete(id)}
              disabled={isDeleting || id === "live"}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:text-red-500 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleRename(id)}
              disabled={isRenaming || !popoverName.trim()}
              className="rounded-lg bg-[#1C1C92] p-1.5 text-white transition-colors hover:bg-[#16166e] disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  const showTagHoverPreview =
    isLive &&
    tagHoverAnchor.markerId &&
    tagHoverAnchor.el &&
    tagMarkerAnchor.markerId !== tagHoverAnchor.markerId;
  const tagHoverListForPopper = showTagHoverPreview
    ? (markers.find((x) => x.id === tagHoverAnchor.markerId)?.tags || []).map(
        (t) => ({
          id: t.clientId,
          label: t.label,
          type: t.type,
          ...(t.colorHex ? { colorHex: t.colorHex } : {}),
        }),
      )
    : [];

  return (
    <div className="relative w-full select-none">
      {/* ── OUTER WAVEFORM CONTAINER ─────────────────────────────────── */}
      <div className="relative h-24 w-full rounded-lg border border-gray-200 bg-[#F3F4F6] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
        {/* Fixed center line — live recording only */}
        {isLive && (
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-30 w-px -translate-x-1/2 bg-red-500/85 shadow-[0_0_6px_rgba(239,68,68,0.45)]" />
        )}

        {/* Completed timeline playback head */}
        {!isLive && totalDuration > 0 && orderedSegments.length > 0 && (
          <div
            className="pointer-events-none absolute inset-y-0 z-[35] w-px bg-red-500/90 shadow-[0_0_6px_rgba(239,68,68,0.45)]"
            style={{
              left: `calc(8px + (100% - 16px) * ${playbackHeadPct / 100})`,
              transform: "translateX(-50%)",
            }}
          />
        )}

        {/* Green markers: same horizontal math as live chip (left edge → playhead at center). */}
        {isLive &&
          duration > 0 &&
          markers.map((m) => {
            const t = Math.min(Math.max(0, m.timestamp / duration), 1);
            const p = (50 - chipWidthPct) / 100 + t * (chipWidthPct / 100);
            const left = `calc(8px + (100% - 16px) * ${p})`;
            return (
              <React.Fragment key={m.id}>
                <div
                  className="pointer-events-none absolute inset-y-0 z-[36] w-0.5 bg-green-500"
                  style={{
                    left,
                    transform: "translateX(-50%)",
                  }}
                />
                <button
                  type="button"
                  className="pointer-events-auto absolute top-0.5 z-[45] flex h-7 w-7 items-center justify-center rounded-sm border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-green-500/50"
                  style={{
                    left,
                    transform: "translateX(-50%)",
                  }}
                  aria-label="Edit bookmark tags"
                  onMouseEnter={(e) => {
                    clearTagHoverTimer();
                    if ((m.tags?.length ?? 0) === 0) return;
                    if (tagMarkerAnchor.markerId === m.id) return;
                    setTagHoverAnchor({ markerId: m.id, el: e.currentTarget });
                  }}
                  onMouseLeave={() => scheduleTagHoverClose()}
                  onClick={(e) => {
                    e.stopPropagation();
                    clearTagHoverTimer();
                    setTagHoverAnchor({ markerId: null, el: null });
                    setTagMarkerAnchor({ markerId: m.id, el: e.currentTarget });
                  }}
                >
                  <Diamond
                    className="h-3.5 w-3.5 fill-green-500 text-green-500 drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]"
                    strokeWidth={2}
                  />
                </button>
              </React.Fragment>
            );
          })}

        {isLive ? (
          /* ── STATE 2: chip right edge at center playhead, width grows toward the left ── */
          <div className="pointer-events-none absolute inset-y-2 left-2 right-2 z-10">
            <div
              className={`absolute inset-y-0 overflow-hidden rounded-l-lg rounded-r-none border border-[#C6C6C7] border-r-0 bg-[#E3E3E4] shadow-sm pointer-events-auto ${
                isRecording && isPaused
                  ? "cursor-grab active:cursor-grabbing"
                  : ""
              }`}
              style={{
                left: `calc(50% - ${chipWidthPct}%)`,
                width: `${chipWidthPct}%`,
              }}
            >
              <div className="absolute left-0 right-0 top-0 z-20">
                <div className="relative flex items-center gap-1.5 border-b border-[#8E9092] bg-[#A1A3A5] px-3 pb-1.5 pt-2">
                  <GripVertical
                    className={`h-3 w-3 shrink-0 text-[#262626] ${isRecording && isPaused ? "cursor-grab" : ""}`}
                  />
                  <button
                    type="button"
                    className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-inherit"
                    aria-label="Rename segment"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      openPopover(
                        "live",
                        pendingName || title || "[Untitled]",
                        e.currentTarget,
                      );
                    }}
                  >
                    <Mic className="h-3 w-3 text-[#262626]" />
                  </button>
                  <span
                    role="button"
                    tabIndex={0}
                    className="max-w-[200px] cursor-pointer truncate text-xs font-semibold tracking-tight text-[#262626]"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      openPopover(
                        "live",
                        pendingName || title || "[Untitled]",
                        e.currentTarget,
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openPopover(
                          "live",
                          pendingName || title || "[Untitled]",
                          e.currentTarget,
                        );
                      }
                    }}
                  >
                    {pendingName || title || "[Untitled]"}
                  </span>
                  <div className="flex-1" />
                  <span className="font-mono text-[10px] tracking-tight text-[#262626]">
                    {formatTimer(duration)}
                  </span>
                  {activePopover === "live" && (
                    <SegmentPopover id="live" duration={duration} />
                  )}
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 top-9 z-10 overflow-hidden rounded-bl-lg bg-[#E3E3E4]">
                <canvas
                  ref={canvasRef}
                  className="block h-full min-h-10 w-full"
                  aria-hidden
                />
              </div>
            </div>
          </div>
        ) : orderedSegments.length > 0 ? (
          /* ── STATE 3: COMPLETED — proportional segment chips ── */
          <div className="absolute inset-2 flex items-stretch gap-1 z-10 overflow-x-auto no-scrollbar">
            {orderedSegments.map((seg, index) => (
              <div
                key={seg._id}
                draggable={!isReordering}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                                    relative flex min-w-[140px] cursor-grab select-none flex-col overflow-hidden rounded-lg border
                                    border-[#C6C6C7] shadow-sm
                                    transition-all duration-150 active:cursor-grabbing
                                    ${
                                      playbackSegmentId &&
                                      String(playbackSegmentId) ===
                                        String(seg._id)
                                        ? "z-[25] bg-[#ECECED]"
                                        : "bg-[#E3E3E4] hover:bg-[#ECECED]"
                                    }
                                    ${
                                      dragOverIndex === index &&
                                      dragIndex !== index
                                        ? "z-20 scale-[1.01] border-primary ring-2 ring-primary/20"
                                        : ""
                                    }
                                    ${dragIndex === index ? "opacity-40 grayscale" : "opacity-100"}
                                `}
                style={{
                  flex: `${seg.duration || 1} 1 0%`,
                }}
              >
                {markers
                  .filter((m) => {
                    const st = Number(seg.startTime) || 0;
                    const en =
                      seg.endTime != null && seg.endTime !== ""
                        ? Number(seg.endTime)
                        : st + (Number(seg.duration) || 0);
                    return m.timestamp >= st && m.timestamp <= en;
                  })
                  .map((m) => {
                    const st = Number(seg.startTime) || 0;
                    const dur = Number(seg.duration) || 1;
                    const pct = dur > 0 ? ((m.timestamp - st) / dur) * 100 : 0;
                    return (
                      <div
                        key={m.id}
                        className="pointer-events-none absolute inset-y-0 z-30 w-0.5 bg-green-500"
                        style={{ left: `${pct}%` }}
                      />
                    );
                  })}
                {/* Chip header */}
                <div className="relative flex shrink-0 items-center gap-1.5 border-b border-[#8E9092] bg-[#A1A3A5] px-2.5 pb-1 pt-2 z-10">
                  <GripVertical className="h-3 w-3 text-[#262626]" />
                  <button
                    type="button"
                    className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-inherit"
                    aria-label="Rename segment"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      openPopover(
                        seg._id,
                        seg.name || "[Untitled]",
                        e.currentTarget,
                      );
                    }}
                  >
                    <Mic className="h-3 w-3 text-[#262626]" />
                  </button>
                  <span
                    role="button"
                    tabIndex={0}
                    className="truncate text-[11px] font-semibold text-[#262626] cursor-pointer"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      openPopover(
                        seg._id,
                        seg.name || "[Untitled]",
                        e.currentTarget,
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openPopover(
                          seg._id,
                          seg.name || "[Untitled]",
                          e.currentTarget,
                        );
                      }
                    }}
                  >
                    {seg.name || "[Untitled]"}
                  </span>
                  <div className="flex-1" />
                  <span className="font-mono text-[10px] text-[#262626]">
                    {formatTimer(seg.duration)}
                  </span>
                  {activePopover === seg._id && (
                    <SegmentPopover
                      id={seg._id}
                      duration={seg.duration}
                      createdAt={
                        seg.createdAt
                          ? new Date(seg.createdAt).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : undefined
                      }
                    />
                  )}
                </div>

                <div className="flex flex-1 items-center justify-center bg-[#E3E3E4] px-2 pb-1.5 pt-0.5">
                  <div
                    className="flex h-full w-full items-center justify-center overflow-hidden"
                    style={{ gap: `${GAP_CSS}px` }}
                  >
                    {Array.from({ length: 80 }).map((_, i) => {
                      const seed = seg._id.charCodeAt(i % seg._id.length);
                      const h =
                        22 +
                        Math.abs(Math.sin(i * 0.55 + seed * 0.02)) * 48 +
                        (seed % 14);
                      return (
                        <div
                          key={i}
                          className="max-h-[92%] shrink-0 rounded-[1px]"
                          style={{
                            width: `${BAR_W_CSS}px`,
                            minWidth: `${BAR_W_CSS}px`,
                            height: `${h}%`,
                            backgroundColor: BAR_FILL,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── STATE 1: EMPTY ── */
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
              <span>Ready to record</span>
            </div>
          </div>
        )}
      </div>

      {isLive && (
        <>
          <BookmarkTagsHoverPopover
            open={Boolean(tagHoverAnchor.el && tagHoverListForPopper.length)}
            anchorEl={tagHoverAnchor.el}
            tags={tagHoverListForPopper}
            onPaperMouseEnter={clearTagHoverTimer}
            onPaperMouseLeave={scheduleTagHoverClose}
          />
          <AddTagPopover
            anchorEl={tagMarkerAnchor.el}
            open={Boolean(tagMarkerAnchor.el && tagMarkerAnchor.markerId)}
            onClose={() => setTagMarkerAnchor({ markerId: null, el: null })}
            blockTime={formatTimer(
              markers.find((x) => x.id === tagMarkerAnchor.markerId)
                ?.timestamp ?? 0,
            )}
            existingTags={(
              markers.find((x) => x.id === tagMarkerAnchor.markerId)?.tags || []
            ).map((t) => ({
              id: t.clientId,
              label: t.label,
              type: t.type,
              ...(t.colorHex ? { colorHex: t.colorHex } : {}),
            }))}
            onSaveTag={(payload) => {
              if (tagMarkerAnchor.markerId) {
                useRecordingStore
                  .getState()
                  .addMarkerTag(tagMarkerAnchor.markerId, payload);
              }
            }}
            recordingApi={{
              definitions: localTagDefinitions,
              addDefinition: (p) =>
                useRecordingStore.getState().addLocalTagDefinition(p),
              updateDefinition: (id, patch) =>
                useRecordingStore
                  .getState()
                  .updateLocalTagDefinition(id, patch),
              removeDefinition: (id) =>
                useRecordingStore.getState().removeLocalTagDefinition(id),
              reorderDefinitions: (ids) =>
                useRecordingStore.getState().reorderLocalTagDefinitions(ids),
              toggleQuickBar: (id) =>
                useRecordingStore.getState().toggleTagShowInQuickBar(id),
            }}
          />
        </>
      )}

      {/* ── TIMELINE RULER ───────────────────────────────────────────── */}
      <div className="mt-2 flex flex-col gap-1 px-0.5">
        <div className="flex h-2 items-end justify-between border-x border-gray-200/90">
          {Array.from({ length: 11 }).map((_, i) => (
            <div
              key={i}
              className={`w-px bg-gray-300/90 ${i % 5 === 0 ? "h-full" : "h-1/2"}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] font-medium tabular-nums text-gray-500">
          {ticks.map((t, i) => (
            <span
              key={i}
              className="w-8 text-center first:text-left last:text-right"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StaticWaveform;
