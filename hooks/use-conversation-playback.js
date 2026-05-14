"use client";

import { useCallback, useEffect, useRef } from "react";
import useConversationStore from "../store/conversation.store";
import { segmentDurationSecForTimeline } from "./segment-duration-for-timeline";

function blockStartMs(block) {
  if (block?.startTimeMs != null && block?.startTimeMs !== "") {
    const n = Number(block.startTimeMs);
    if (!Number.isNaN(n)) return n;
  }
  if (block?.startTime != null && block?.startTime !== "") {
    const n = Number(block.startTime);
    if (!Number.isNaN(n)) return n * 1000;
  }
  return 0;
}

function blockEndMs(block) {
  if (block?.endTimeMs != null && block?.endTimeMs !== "") {
    const n = Number(block.endTimeMs);
    if (!Number.isNaN(n)) return n;
  }
  if (block?.endTime != null && block?.endTime !== "") {
    const n = Number(block.endTime);
    if (!Number.isNaN(n)) return n * 1000;
  }
  return blockStartMs(block);
}

function sortedSegments(segments) {
  return [...(segments || [])].sort(
    (a, b) => (a.order || 0) - (b.order || 0),
  );
}

function segmentDurForPlayback(seg) {
  return segmentDurationSecForTimeline(
    seg,
    useConversationStore.getState().segmentMetaDurationById || {},
  );
}

/** Cumulative timeline start for `segId` (not raw `seg.startTime` when segments share startTime 0). */
function timelineStartForSegment(segments, segId) {
  const list = sortedSegments(segments);
  let acc = 0;
  for (const s of list) {
    if (String(s._id) === String(segId)) {
      const stRaw = Number(s.startTime);
      return Number.isFinite(stRaw) && stRaw >= acc ? stRaw : acc;
    }
    const stRaw = Number(s.startTime);
    const timelineStart = Number.isFinite(stRaw) && stRaw >= acc ? stRaw : acc;
    const dur = segmentDurForPlayback(s);
    acc = timelineStart + dur;
  }
  return 0;
}

/** When API leaves `conversation.totalDuration` at 0 but segments have audio, still allow playback. */
export function effectiveTotalDuration(conversation, segments) {
  const td = Number(conversation?.totalDuration) || 0;
  if (td > 0) return td;
  const list = sortedSegments(segments);
  if (!list.some((s) => s.fileUrl)) return 0;
  let maxEnd = 0;
  for (const s of list) {
    const st = Number(s.startTime) || 0;
    const en =
      s.endTime != null && s.endTime !== ""
        ? Number(s.endTime)
        : st + (Number(s.duration) || 0);
    maxEnd = Math.max(maxEnd, en);
  }
  return maxEnd > 0 ? maxEnd : Number.POSITIVE_INFINITY;
}

function findSegmentOwningCumulativeTime(segments, globalT) {
  const list = sortedSegments(segments);
  if (!list.length) return null;
  let accEnd = 0;
  for (const seg of list) {
    const stRaw = Number(seg.startTime);
    const timelineStart =
      Number.isFinite(stRaw) && stRaw >= accEnd ? stRaw : accEnd;
    const dur = segmentDurForPlayback(seg);
    const regionEnd = timelineStart + dur;
    if (globalT + 1e-9 >= timelineStart && globalT <= regionEnd + 1e-3) {
      return seg;
    }
    accEnd = regionEnd;
  }
  return list[list.length - 1];
}

function findBlockAtGlobalTime(transcript, segments, t) {
  const list = sortedSegments(segments);
  const blocks = (transcript?.blocks || []).filter(
    (b) => b && !b.isDeleted && b.isActive !== false,
  );
  let best = null;
  let bestStart = -1;
  for (const block of blocks) {
    const seg = list.find(
      (s) => s._id?.toString() === block.segmentId?.toString(),
    );
    if (!seg) continue;
    const st = Number(seg.startTime) || 0;
    const sm = blockStartMs(block);
    const em = blockEndMs(block);
    const gs = st + sm / 1000;
    const ge = st + em / 1000;
    if (t + 1e-6 >= gs && t <= ge + 0.05) {
      if (gs >= bestStart) {
        bestStart = gs;
        best = block;
      }
    }
  }
  return best;
}

export function useConversationPlayback() {
  const audioRef = useRef(null);
  const loadedSegmentIdRef = useRef(null);
  /** Skip timeupdate while swapping <audio> src (avoids stale currentTime → wrong active segment). */
  const suppressTimeUpdateRef = useRef(false);

  const setPlaybackState = useConversationStore((s) => s.setPlaybackState);
  const conversation = useConversationStore((s) => s.conversation);
  const segments = useConversationStore((s) => s.segments);
  const isPlaying = useConversationStore((s) => s.isPlaying);
  const currentTime = useConversationStore((s) => s.currentTime);
  const playbackRate =
    useConversationStore((s) => s.playbackRate) || 1;

  const totalDuration = effectiveTotalDuration(conversation, segments);

  const pushPlaybackUi = useCallback(
    (globalSec, opts) => {
      const state = useConversationStore.getState();
      const segs = sortedSegments(state.segments);
      const tr = state.transcript;
      const total = effectiveTotalDuration(state.conversation, state.segments);
      const clamped = Math.max(0, Math.min(globalSec, total));
      const pinnedId = opts?.segmentId != null ? String(opts.segmentId) : null;
      const segFromAudio = pinnedId
        ? segs.find((s) => s._id?.toString() === pinnedId)
        : null;
      const seg =
        segFromAudio ?? findSegmentOwningCumulativeTime(segs, clamped);
      const block = findBlockAtGlobalTime(tr, segs, clamped);
      setPlaybackState({
        currentTime: clamped,
        playbackSegmentId: seg?._id?.toString() ?? null,
        playbackBlockId: block?._id?.toString() ?? null,
      });
    },
    [setPlaybackState],
  );

  const loadAudioAtGlobalTime = useCallback(
    (globalSec, andPlay) => {
      return new Promise((resolve) => {
        const state = useConversationStore.getState();
        const rate = state.playbackRate || 1;
        const segs = sortedSegments(state.segments);
        const seg = findSegmentOwningCumulativeTime(segs, globalSec);
        const total = effectiveTotalDuration(state.conversation, state.segments);
        const clamped = Math.max(0, Math.min(globalSec, total));
        if (!seg?.fileUrl || !audioRef.current) {
          pushPlaybackUi(clamped);
          resolve();
          return;
        }
        const a = audioRef.current;
        const segKey = seg._id?.toString();
        const timelineStart = timelineStartForSegment(segs, segKey);
        const offset = Math.max(0, clamped - timelineStart);

        a.playbackRate = rate;

        const startPlayback = () => {
          const bufDur = Number.isFinite(a.duration) ? a.duration : NaN;
          if (Number.isFinite(bufDur) && bufDur > 0 && segKey) {
            useConversationStore.getState().setSegmentMetaDuration(segKey, bufDur);
          }
          a.currentTime = offset;
          pushPlaybackUi(timelineStart + offset, { segmentId: segKey });
          if (andPlay) {
            console.log("[playback] audio.play()", {
              segmentId: segKey,
              audioBufferDuration: bufDur,
              offset,
              globalTime: timelineStart + offset,
            });
            a.play().catch(() => {});
            setPlaybackState({ isPlaying: true });
          }
          resolve();
        };

        if (loadedSegmentIdRef.current !== segKey) {
          suppressTimeUpdateRef.current = true;
          loadedSegmentIdRef.current = segKey;
          a.pause();
          a.src = seg.fileUrl;
          a.load();
          const onReady = () => {
            a.removeEventListener("loadedmetadata", onReady);
            a.removeEventListener("error", onErr);
            suppressTimeUpdateRef.current = false;
            startPlayback();
          };
          const onErr = () => {
            a.removeEventListener("loadedmetadata", onReady);
            a.removeEventListener("error", onErr);
            suppressTimeUpdateRef.current = false;
            resolve();
          };
          a.addEventListener("loadedmetadata", onReady, { once: true });
          a.addEventListener("error", onErr, { once: true });
        } else {
          startPlayback();
        }
      });
    },
    [pushPlaybackUi, setPlaybackState],
  );

  useEffect(() => {
    const a = new Audio();
    a.preload = "auto";
    audioRef.current = a;

    const onTimeUpdate = () => {
      const state = useConversationStore.getState();
      if (!state.isPlaying) return;
      if (suppressTimeUpdateRef.current) return;
      const segId = loadedSegmentIdRef.current;
      const segs = sortedSegments(state.segments);
      const seg = segs.find((s) => s._id?.toString() === segId);
      if (!seg) return;
      const timelineStart = timelineStartForSegment(segs, segId);
      const ct = Number.isFinite(a.currentTime) ? a.currentTime : 0;
      const globalT = timelineStart + ct;
      pushPlaybackUi(globalT, { segmentId: segId });
    };

    const onEnded = () => {
      const state = useConversationStore.getState();
      const rate = state.playbackRate || 1;
      const order = sortedSegments(state.segments);
      const curId = loadedSegmentIdRef.current;
      const idx = order.findIndex((s) => s._id?.toString() === curId);
      const next = idx >= 0 ? order[idx + 1] : null;
      const total = effectiveTotalDuration(state.conversation, state.segments);

      if (next?.fileUrl) {
        suppressTimeUpdateRef.current = true;
        loadedSegmentIdRef.current = next._id.toString();
        const a2 = audioRef.current;
        a2.pause();
        a2.src = next.fileUrl;
        a2.load();
        a2.addEventListener(
          "error",
          () => {
            suppressTimeUpdateRef.current = false;
          },
          { once: true },
        );
        a2.addEventListener(
          "loadedmetadata",
          () => {
            a2.currentTime = 0;
            a2.playbackRate = rate;
            const bufDur = Number.isFinite(a2.duration) ? a2.duration : NaN;
            if (Number.isFinite(bufDur) && bufDur > 0) {
              useConversationStore
                .getState()
                .setSegmentMetaDuration(String(next._id), bufDur);
            }
            const nextGlobal = timelineStartForSegment(order, next._id);
            pushPlaybackUi(nextGlobal, {
              segmentId: next._id,
            });
            console.log("[playback] audio.play()", {
              segmentId: String(next._id),
              audioBufferDuration: bufDur,
              offset: 0,
              globalTime: nextGlobal,
            });
            a2.play().catch(() => {});
            setPlaybackState({ isPlaying: true });
            suppressTimeUpdateRef.current = false;
          },
          { once: true },
        );
      } else {
        setPlaybackState({ isPlaying: false });
        const endT = Number.isFinite(total) ? total : state.currentTime || 0;
        pushPlaybackUi(endT);
      }
    };

    a.addEventListener("timeupdate", onTimeUpdate);
    a.addEventListener("ended", onEnded);

    return () => {
      a.pause();
      a.removeAttribute("src");
      a.load();
      a.removeEventListener("timeupdate", onTimeUpdate);
      a.removeEventListener("ended", onEnded);
      audioRef.current = null;
      loadedSegmentIdRef.current = null;
    };
  }, [pushPlaybackUi, setPlaybackState]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlayPause = useCallback(() => {
    const state = useConversationStore.getState();
    const playing = state.isPlaying;
    const segs = sortedSegments(state.segments);
    if (!segs.some((s) => s.fileUrl)) return;

    const total = effectiveTotalDuration(state.conversation, state.segments);
    if (total === 0) return;

    if (playing) {
      audioRef.current?.pause();
      setPlaybackState({ isPlaying: false });
      return;
    }

    let t = state.currentTime || 0;
    if (Number.isFinite(total) && t >= total - 0.05) t = 0;

    loadAudioAtGlobalTime(t, true);
  }, [loadAudioAtGlobalTime, setPlaybackState]);

  const seekBy = useCallback(
    (deltaSec) => {
      const state = useConversationStore.getState();
      const total = effectiveTotalDuration(state.conversation, state.segments);
      const next = Math.max(0, Math.min((state.currentTime || 0) + deltaSec, total));
      const wasPlaying = state.isPlaying;
      void loadAudioAtGlobalTime(next, wasPlaying).then(() => {
        if (!wasPlaying) {
          audioRef.current?.pause();
          setPlaybackState({ isPlaying: false });
        }
      });
    },
    [loadAudioAtGlobalTime, setPlaybackState],
  );

  /** Absolute seek: loads correct segment + offset; `resumePlaying` restores play after scrub. */
  const seekToGlobalTime = useCallback(
    (globalSec, resumePlaying) => {
      const state = useConversationStore.getState();
      const total = effectiveTotalDuration(state.conversation, state.segments);
      const next = Math.max(0, Math.min(Number(globalSec) || 0, total));
      return loadAudioAtGlobalTime(next, Boolean(resumePlaying)).then(() => {
        if (!resumePlaying) {
          audioRef.current?.pause();
          setPlaybackState({ isPlaying: false });
        }
      });
    },
    [loadAudioAtGlobalTime, setPlaybackState],
  );

  /** UI-only head move (no audio decode) — for timeline drag scrub between commits. */
  const scrubPlaybackUiTo = useCallback(
    (globalSec) => {
      pushPlaybackUi(globalSec);
    },
    [pushPlaybackUi],
  );

  const stopPlayback = useCallback(() => {
    audioRef.current?.pause();
    setPlaybackState({ isPlaying: false });
  }, [setPlaybackState]);

  return {
    isPlaying,
    currentTime,
    totalDuration,
    togglePlayPause,
    skipBack: () => seekBy(-5),
    skipForward: () => seekBy(5),
    stopPlayback,
    seekToGlobalTime,
    scrubPlaybackUiTo,
  };
}
