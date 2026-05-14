"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import { createPortal } from "react-dom";
import { Diamond, GripVertical, Mic, Trash2, Send } from "lucide-react";
import useConversationStore from "@/store/conversation.store";
import { useRecordingStore } from "@/store/recording.store";
import { conversationServices } from "@/services/conversationServices";
import useGetConversation from "@/hooks/use-get-conversation";
import { effectiveTotalDuration } from "@/hooks/use-conversation-playback";
import { segmentDurationSecForTimeline } from "@/hooks/segment-duration-for-timeline";
import { TIMELINE_PX_PER_SEC } from "@/hooks/timeline-constants";
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

/** Bar geometry in CSS pixels (canvas + STATE 3 — uniform bar width) */
const BAR_W_CSS = 2.5;
const GAP_CSS = 0.85;

const WAVEFORM_BG = "#E3E3E4";
const BAR_FILL = "#979797";

/** Figma: waveform strip height (px) */
const STATE3_WAVEFORM_H_PX = 70;

/** How many RMS/max samples to take along the decoded buffer (resampled per bar count in UI). */
const WAVEFORM_DECODE_BINS = 512;

/** Linear resample peaks[i] for i in 0..nBars-1 */
function resamplePeakAt(peaks, i, nBars) {
  if (!peaks?.length) return 0.35;
  if (nBars <= 1) return peaks[Math.floor(peaks.length / 2)] ?? 0.35;
  const t = i / (nBars - 1);
  const x = t * (peaks.length - 1);
  const i0 = Math.floor(x);
  const i1 = Math.min(peaks.length - 1, i0 + 1);
  const f = x - i0;
  return peaks[i0] * (1 - f) + peaks[i1] * f;
}

/** Decode segment audio and return normalized peak envelope (0..1) + PCM duration. */
async function decodeSegmentWaveformPeaks512(fileUrl) {
  const res = await fetch(fileUrl, { mode: "cors" });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const raw = await res.arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error("no AudioContext");
  const ctx = new Ctx();
  try {
    const buf = await ctx.decodeAudioData(raw.slice(0));
    const dur = buf.duration;
    const ch0 = buf.getChannelData(0);
    const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
    const bins = WAVEFORM_DECODE_BINS;
    const binW = Math.max(1, Math.floor(ch0.length / bins));
    const peaks = new Float32Array(bins);
    for (let b = 0; b < bins; b++) {
      const s0 = b * binW;
      const s1 = Math.min(ch0.length, s0 + binW);
      let m = 0;
      for (let j = s0; j < s1; j++) {
        const a = Math.abs(ch0[j]);
        const b2 = ch1 ? Math.abs(ch1[j]) : 0;
        m = Math.max(m, a, b2);
      }
      peaks[b] = m;
    }
    let mx = 1e-8;
    for (let b = 0; b < bins; b++) mx = Math.max(mx, peaks[b]);
    for (let b = 0; b < bins; b++) peaks[b] /= mx;
    return { peaks: Array.from(peaks), durationSec: dur };
  } finally {
    await ctx.close();
  }
}

/** STATE 3 pseudo-waveform — fixed bar width; gap stretches edge-to-edge; heights from decoded peaks when available. */
function drawState3WaveformBars(seg, widthPx, peaks512) {
  const innerW = Math.max(1, widthPx - 4);
  let n = Math.floor((innerW + GAP_CSS) / (BAR_W_CSS + GAP_CSS));
  n = Math.min(480, Math.max(1, n));

  const buildBar = (i, barW) => {
    let h;
    if (Array.isArray(peaks512) && peaks512.length > 0) {
      const amp = resamplePeakAt(peaks512, i, n);
      h = 10 + amp * 82;
    } else {
      const seed = seg._id.charCodeAt(i % seg._id.length);
      h =
        22 +
        Math.abs(Math.sin(i * 0.55 + seed * 0.02)) * 48 +
        (seed % 14);
    }
    return (
      <div
        key={`${seg._id}-bar-${i}`}
        className="max-h-[92%] min-h-[2px] shrink-0 self-center rounded-[1px]"
        style={{
          width: barW,
          minWidth: barW,
          maxWidth: barW,
          height: `${h}%`,
          backgroundColor: BAR_FILL,
        }}
      />
    );
  };

  if (n <= 1) {
    let hOne = 45;
    if (Array.isArray(peaks512) && peaks512.length > 0) {
      let s = 0;
      for (let k = 0; k < peaks512.length; k++) s += peaks512[k];
      hOne = 10 + (s / peaks512.length) * 82;
    } else {
      const seed = seg._id.charCodeAt(0);
      hOne = 22 + Math.abs(Math.sin(seed * 0.02)) * 48 + (seed % 14);
    }
    return {
      bars: [
        <div
          key={`${seg._id}-bar-0`}
          className="max-h-[92%] min-h-[2px] shrink-0 self-center rounded-[1px]"
          style={{
            width: innerW,
            minWidth: innerW,
            maxWidth: innerW,
            height: `${hOne}%`,
            backgroundColor: BAR_FILL,
          }}
        />,
      ],
      waveGapPx: 0,
    };
  }

  let gapPx = (innerW - n * BAR_W_CSS) / (n - 1);
  const GAP_MIN = 0.35;
  while (n > 1 && gapPx < GAP_MIN) {
    n -= 1;
    gapPx = n <= 1 ? 0 : (innerW - n * BAR_W_CSS) / (n - 1);
  }

  if (n <= 1) {
    let hOne = 45;
    if (Array.isArray(peaks512) && peaks512.length > 0) {
      let s = 0;
      for (let k = 0; k < peaks512.length; k++) s += peaks512[k];
      hOne = 10 + (s / peaks512.length) * 82;
    } else {
      const seed = seg._id.charCodeAt(0);
      hOne = 22 + Math.abs(Math.sin(seed * 0.02)) * 48 + (seed % 14);
    }
    return {
      bars: [
        <div
          key={`${seg._id}-bar-0`}
          className="max-h-[92%] min-h-[2px] shrink-0 self-center rounded-[1px]"
          style={{
            width: innerW,
            minWidth: innerW,
            maxWidth: innerW,
            height: `${hOne}%`,
            backgroundColor: BAR_FILL,
          }}
        />,
      ],
      waveGapPx: 0,
    };
  }

  const bars = Array.from({ length: n }, (_, i) => buildBar(i, BAR_W_CSS));
  return { bars, waveGapPx: gapPx };
}

/** Local playback progress line — ONLY mount under active segment; subscribes to global time. */
const State3ActivePlaybackProgress = memo(
  function State3ActivePlaybackProgress({
    timelineStart,
    durationSec,
    segmentId,
  }) {
    const currentTime = useConversationStore((s) => s.currentTime);
    const playbackSegmentId = useConversationStore((s) => s.playbackSegmentId);
    if (String(playbackSegmentId) !== String(segmentId)) return null;
    if (!Number.isFinite(durationSec) || durationSec <= 0) return null;
    const local = Math.max(
      0,
      Math.min((currentTime || 0) - timelineStart, durationSec),
    );
    const pct = (local / durationSec) * 100;
    return (
      <div
        className="pointer-events-none absolute inset-y-0 z-[32] w-0.5 bg-[#1C1C92]/90"
        style={{
          left: `${pct}%`,
          transform: "translateX(-50%)",
          boxShadow: "0 0 4px rgba(28,28,146,0.35)",
        }}
        aria-hidden
      />
    );
  },
);

const StaticWaveform = ({ mediaStream, pendingName, onPendingNameChange }) => {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const audioContextRef = useRef(null);
  const isPausedRef = useRef(false);
  // Ring-buffer for rolling waveform history (live STATE 2 only)
  const ampBufferRef = useRef(new Float32Array(4000));
  const ampHeadRef = useRef(0);
  const pxPerSecRef = useRef(0);
  /** Narrow selectors — never subscribe to full store (currentTime ticks would re-render every chip). */
  const conversation = useConversationStore((s) => s.conversation);
  const segments = useConversationStore((s) => s.segments);
  const playbackIsPlaying = useConversationStore((s) => s.isPlaying);
  const playbackSegmentId = useConversationStore((s) => s.playbackSegmentId);
  const segmentMetaDurationById = useConversationStore(
    (s) => s.segmentMetaDurationById,
  );
  const setSegmentMetaDuration = useConversationStore(
    (s) => s.setSegmentMetaDuration,
  );
  const clearSegmentMetaDurations = useConversationStore(
    (s) => s.clearSegmentMetaDurations,
  );
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
  /** Decoded amplitude envelope per segment (512 bins, 0..1) — drives bar heights. */
  const [segmentPeaksById, setSegmentPeaksById] = useState({});
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
  const state3ViewportRef = useRef(null);
  const state3TrackRef = useRef(null);
  const fetchedSegmentMetaIdsRef = useRef(new Set());
  const waveformDecodeInflightRef = useRef(new Set());

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
  const timelineEndForTicks =
    totalDuration > 0
      ? totalDuration
      : Math.min(
          effectiveTotalDuration(conversation, segments),
          Number.MAX_SAFE_INTEGER,
        );
  const ticks = generateTicks(
    Number.isFinite(timelineEndForTicks) && timelineEndForTicks < 1e15
      ? timelineEndForTicks
      : totalDuration,
  );

  const state3TrackLayout = useMemo(() => {
    if (!orderedSegments?.length) return [];
    const list = [...orderedSegments];
    let accEnd = 0;
    return list.map((seg) => {
      const stRaw = Number(seg.startTime);
      const timelineStart =
        Number.isFinite(stRaw) && stRaw >= accEnd ? stRaw : accEnd;
      const dur = segmentDurationSecForTimeline(seg, segmentMetaDurationById);
      const widthPx = Math.max(1, Math.round(dur * TIMELINE_PX_PER_SEC));
      accEnd = timelineStart + dur;
      return { seg, timelineStart, durationSec: dur, widthPx };
    });
  }, [orderedSegments, segmentMetaDurationById]);

  /** Frozen waveform + bookmark DOM for STATE 3 — must NOT rebuild on every global time tick. */
  const state3FrozenLayers = useMemo(() => {
    return state3TrackLayout.map(
      ({ seg, timelineStart, durationSec, widthPx }) => {
        const markersHere = markers.filter((m) => {
          const en = timelineStart + durationSec;
          return (
            m.timestamp >= timelineStart - 1e-3 && m.timestamp <= en + 1e-3
          );
        });
        const { bars, waveGapPx } = drawState3WaveformBars(
          seg,
          widthPx,
          segmentPeaksById[String(seg._id)],
        );
        return {
          segId: String(seg._id),
          bars,
          waveGapPx,
          markersHere,
          timelineStart,
          durationSec,
        };
      },
    );
  }, [state3TrackLayout, markers, segmentPeaksById]);

  // Decode each segment file to real peaks + authoritative duration (width ∝ duration, heights ∝ amplitude).
  useEffect(() => {
    if (isLive || !state3TrackLayout.length) return;
    let cancelled = false;
    const run = async () => {
      for (const { seg } of state3TrackLayout) {
        const id = String(seg._id);
        if (!seg.fileUrl || id in segmentPeaksById) continue;
        if (waveformDecodeInflightRef.current.has(id)) continue;
        waveformDecodeInflightRef.current.add(id);
        try {
          const { peaks, durationSec } = await decodeSegmentWaveformPeaks512(
            seg.fileUrl,
          );
          if (cancelled) return;
          if (Number.isFinite(durationSec) && durationSec > 0) {
            setSegmentMetaDuration(id, durationSec);
          }
          setSegmentPeaksById((prev) => {
            if (Object.hasOwn(prev, id)) return prev;
            return { ...prev, [id]: peaks };
          });
        } catch {
          setSegmentPeaksById((prev) => {
            if (Object.hasOwn(prev, id)) return prev;
            return { ...prev, [id]: null };
          });
        } finally {
          waveformDecodeInflightRef.current.delete(id);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [
    isLive,
    state3TrackLayout,
    segmentPeaksById,
    setSegmentMetaDuration,
  ]);
  useEffect(() => {
    if (segments?.length) {
      const sorted = [...segments].sort(
        (a, b) => (a.order || 0) - (b.order || 0),
      );
      setOrderedSegments(sorted);
    } else {
      setOrderedSegments([]);
      fetchedSegmentMetaIdsRef.current = new Set();
      setSegmentPeaksById({});
      clearSegmentMetaDurations();
    }
  }, [segments, clearSegmentMetaDurations]);

  useEffect(() => {
    if (!orderedSegments?.length) return;
    const cleanups = [];
    orderedSegments.forEach((seg) => {
      const id = String(seg._id);
      if (!seg.fileUrl || fetchedSegmentMetaIdsRef.current.has(id)) return;
      fetchedSegmentMetaIdsRef.current.add(id);
      const a = new Audio();
      a.preload = "metadata";
      const onMeta = () => {
        const d = a.duration;
        if (!Number.isFinite(d) || d <= 0) return;
        setSegmentMetaDuration(id, d);
      };
      a.addEventListener("loadedmetadata", onMeta, { once: true });
      a.addEventListener("error", () => {}, { once: true });
      a.src = seg.fileUrl;
      cleanups.push(() => {
        a.removeAttribute("src");
        a.load();
      });
    });
    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [orderedSegments, setSegmentMetaDuration]);

  // After segment widths / metadata settle, sync track translate before paint (avoids one-frame collapse).
  useLayoutEffect(() => {
    if (isLive || orderedSegments.length === 0) return;
    const vp = state3ViewportRef.current;
    const tr = state3TrackRef.current;
    if (!vp || !tr) return;
    const t = useConversationStore.getState().currentTime || 0;
    const centerX = vp.offsetWidth / 2;
    tr.style.transform = `translate3d(${centerX - t * TIMELINE_PX_PER_SEC}px, 0, 0)`;
  }, [isLive, orderedSegments.length, state3TrackLayout]);

  useEffect(() => {
    if (isLive || orderedSegments.length === 0) return;
    const vp = state3ViewportRef.current;
    if (!vp) return;
    let rafId;
    const apply = () => {
      const tr = state3TrackRef.current;
      if (!tr) return;
      const t = useConversationStore.getState().currentTime || 0;
      const centerX = vp.offsetWidth / 2;
      tr.style.transform = `translate3d(${centerX - t * TIMELINE_PX_PER_SEC}px, 0, 0)`;
    };
    const loop = () => {
      apply();
      if (useConversationStore.getState().isPlaying) {
        rafId = requestAnimationFrame(loop);
      }
    };
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            apply();
          })
        : null;
    ro?.observe(vp);
    if (playbackIsPlaying) {
      rafId = requestAnimationFrame(loop);
    } else {
      apply();
    }
    return () => {
      ro?.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [
    isLive,
    orderedSegments.length,
    playbackIsPlaying,
    state3TrackLayout.length,
  ]);

  // Paused / seek: sync track translate without subscribing parent to currentTime (avoids re-rendering all chips).
  useEffect(() => {
    if (isLive || orderedSegments.length === 0) return;
    const vp = state3ViewportRef.current;
    const tr = state3TrackRef.current;
    if (!vp || !tr) return;
    const apply = () => {
      const st = useConversationStore.getState();
      const t = st.currentTime || 0;
      const centerX = vp.offsetWidth / 2;
      tr.style.transform = `translate3d(${centerX - t * TIMELINE_PX_PER_SEC}px, 0, 0)`;
    };
    const unsub = useConversationStore.subscribe((state, prev) => {
      if (state.isPlaying) return;
      if (
        state.currentTime !== prev.currentTime ||
        (prev.isPlaying && !state.isPlaying)
      ) {
        apply();
      }
    });
    apply();
    return () => unsub();
  }, [isLive, orderedSegments.length]);

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

    ampBufferRef.current = new Float32Array(4000);
    ampHeadRef.current = 0;

    const draw = () => {
      requestRef.current = requestAnimationFrame(draw);

      const w = canvas.width;
      const h = canvas.height;
      const cssW = layoutRef.cssW;
      const barW = (BAR_W_CSS / cssW) * w;
      const gap = (GAP_CSS / cssW) * w;
      const step = barW + gap;
      const centerX = w / 2;

      pxPerSecRef.current = step * 30;

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

      if (!isPausedRef.current) {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);

        const n = Math.max(1, Math.floor((w + gap) / step));
        const slice = Math.max(2, Math.floor(timeData.length / n));

        let freqNorm = 0;
        {
          const b0 = Math.max(1, Math.floor((fMin / nyquist) * freqBins));
          const b1 = freqBins - 1;
          let peak = 0;
          for (let b = b0; b <= b1; b++) peak = Math.max(peak, freqData[b]);
          freqNorm = peak / 255;
        }

        let sumSq = 0;
        for (let j = 0; j < slice; j++) {
          const v = (timeData[j] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / slice);
        const timeNorm = Math.min(1, rms * 5.2);

        const mix = Math.min(1, 0.52 * freqNorm + 0.48 * timeNorm);
        const boosted = Math.pow(mix, 0.52);
        const amp = 0.06 + 0.94 * boosted;

        const idx = ampHeadRef.current % ampBufferRef.current.length;
        ampBufferRef.current[idx] = amp;
        ampHeadRef.current += 1;
      }

      const totalFrames = ampHeadRef.current;
      const nBarsLeft = Math.ceil(centerX / step) + 1;

      for (let i = 0; i < nBarsLeft; i++) {
        const frameIdx = totalFrames - 1 - i;
        if (frameIdx < 0) break;

        const amp =
          ampBufferRef.current[frameIdx % ampBufferRef.current.length];
        const shaped = 0.06 + 0.94 * Math.pow(amp, 0.52);
        const barH = Math.max(2, shaped * h * 0.8);
        const x = centerX - i * step - barW / 2;

        if (x + barW < 0) break;

        drawBar(x, (h - barH) / 2, barW, barH, BAR_FILL);
      }

      {
        const nBarsRight = Math.ceil((w - centerX) / step);
        for (let i = 1; i <= nBarsRight; i++) {
          const x = centerX + i * step - barW / 2;
          if (x > w) break;
          drawBar(x, (h - 2) / 2, barW, 2, `${BAR_FILL}55`);
        }
      }
    };

    draw();

    return () => {
      ro?.disconnect();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (audioContextRef.current?.state !== "closed")
        audioContextRef.current?.close();
      ampBufferRef.current = new Float32Array(4000);
      ampHeadRef.current = 0;
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

  isPausedRef.current = isPaused;

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
      <div
        className={`relative w-full overflow-hidden rounded-lg border border-gray-200 bg-[#F3F4F6] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ${
          isLive || orderedSegments.length === 0 ? "h-24" : "h-[120px]"
        }`}
      >
        {/* Green markers: offset left of center by elapsed time × px/sec (rolling tape). */}
        {isLive &&
          duration > 0 &&
          markers.map((m) => {
            const secsAgo = duration - m.timestamp;
            const pxAgo = secsAgo * (pxPerSecRef.current || 0);
            const left = `calc(50% - ${pxAgo}px)`;
            if (pxPerSecRef.current > 0 && pxAgo > window.innerWidth / 2) {
              return null;
            }
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
          /* ── STATE 2: full-width rolling tape — canvas fills container ── */
          <div className="pointer-events-none absolute inset-y-2 left-2 right-2 z-10">
            <div className="pointer-events-auto absolute left-0 right-0 top-0 z-20">
              <div
                className={`relative flex items-center gap-1.5 border-b border-[#8E9092] bg-[#A1A3A5] px-3 pb-1.5 pt-2 rounded-t-lg ${
                  isRecording && isPaused
                    ? "cursor-grab active:cursor-grabbing"
                    : ""
                }`}
              >
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

            <div className="absolute inset-x-0 bottom-0 top-9 z-10 overflow-hidden rounded-b-lg bg-[#E3E3E4]">
              <canvas
                ref={canvasRef}
                className="block h-full min-h-10 w-full"
                aria-hidden
              />
            </div>
          </div>
        ) : orderedSegments.length > 0 ? (
          /* ── STATE 3: DAW-style — fixed center playhead, track translateX, width ∝ duration ── */
          <div
            ref={state3ViewportRef}
            className="absolute inset-0 z-10 overflow-hidden"
          >
            <div
              ref={state3TrackRef}
              className="absolute inset-0 flex flex-nowrap items-stretch gap-1 will-change-transform"
            >
              {state3TrackLayout.map(
                ({ seg, timelineStart, durationSec, widthPx }, index) => {
                  const frozen = state3FrozenLayers[index];
                  const waveGapPx =
                    typeof frozen.waveGapPx === "number"
                      ? frozen.waveGapPx
                      : GAP_CSS;
                  return (
                    <div
                      key={seg._id}
                      draggable={!isReordering}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`
                                    relative box-border flex flex-none cursor-grab select-none flex-col overflow-hidden rounded-[8px] border
                                    border-[#C6C6C7] bg-[#E3E3E4] shadow-sm hover:bg-[#ECECED]
                                    active:cursor-grabbing
                                    ${
                                      dragIndex === index
                                        ? "opacity-40 grayscale"
                                        : ""
                                    }
                                `}
                      style={{
                        width: widthPx,
                        minWidth: widthPx,
                        maxWidth: widthPx,
                        flexShrink: 0,
                        flexGrow: 0,
                      }}
                    >
                      {(playbackSegmentId &&
                        String(playbackSegmentId) === String(seg._id)) ||
                      (dragOverIndex === index && dragIndex !== index) ? (
                        <div
                          className="pointer-events-none absolute inset-0 z-[28] rounded-[inherit]"
                          aria-hidden
                          style={{
                            boxShadow:
                              playbackSegmentId &&
                              String(playbackSegmentId) === String(seg._id)
                                ? "inset 0 0 0 2px rgba(28, 28, 146, 0.48)"
                                : "inset 0 0 0 2px rgba(28, 28, 146, 0.22)",
                          }}
                        />
                      ) : null}
                      {frozen.markersHere.map((m) => {
                        const pct =
                          durationSec > 0
                            ? ((m.timestamp - timelineStart) / durationSec) *
                              100
                            : 0;
                        return (
                          <div
                            key={m.id}
                            className="pointer-events-none absolute inset-y-0 z-30 w-0.5 bg-green-500"
                            style={{ left: `${pct}%` }}
                          />
                        );
                      })}
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
                                ? new Date(seg.createdAt).toLocaleString(
                                    "en-GB",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    },
                                  )
                                : undefined
                            }
                          />
                        )}
                      </div>

                      <div className="relative shrink-0 bg-[#E3E3E4]">
                        <div
                          className="relative w-full shrink-0 overflow-hidden rounded-[8px] bg-[#E3E3E4]"
                          style={{ height: STATE3_WAVEFORM_H_PX }}
                        >
                          <div
                            className="flex h-full w-full items-center justify-start overflow-hidden"
                            style={{ gap: `${waveGapPx}px` }}
                          >
                            {frozen.bars}
                          </div>
                          {playbackSegmentId &&
                            String(playbackSegmentId) === String(seg._id) && (
                              <State3ActivePlaybackProgress
                                timelineStart={timelineStart}
                                durationSec={durationSec}
                                segmentId={String(seg._id)}
                              />
                            )}
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
            {(segments?.length ?? 0) > 0 &&
              segments?.some((s) => s.fileUrl) && (
                <div
                  className="pointer-events-none absolute left-1/2 top-0 z-[100002] -translate-x-1/2"
                  style={{
                    top: 0,
                    bottom: 0,
                    width: 2,
                    backgroundColor: "#FF0000",
                    zIndex: 99999,
                    opacity: 1,
                    visibility: "visible",
                    boxShadow: "0 0 6px 1px rgba(255,0,0,0.85)",
                  }}
                />
              )}
          </div>
        ) : (
          /* ── STATE 1: EMPTY ── */
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
              <span>Ready to record</span>
            </div>
          </div>
        )}
        {/* Red playhead — live recording; fixed at center (STATE 2) */}
        {isLive && (
          <div
            className="pointer-events-none absolute left-1/2 top-0 bottom-0 z-[100002] -translate-x-1/2"
            style={{
              width: 2,
              backgroundColor: "#FF0000",
              zIndex: 99999,
              opacity: 1,
              visibility: "visible",
              boxShadow: "0 0 6px 1px rgba(255,0,0,0.85)",
            }}
          />
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
      <div className="mt-2 flex flex-col gap-1 px-0">
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
