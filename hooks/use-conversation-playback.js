"use client";

import { useCallback, useEffect, useRef } from "react";
import useConversationStore from "../store/conversation.store";

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

function findSegmentAtGlobalTime(segments, t) {
  const list = sortedSegments(segments);
  let best = null;
  let bestStart = -Infinity;
  for (const seg of list) {
    const st = Number(seg.startTime) || 0;
    const en =
      seg.endTime != null && seg.endTime !== ""
        ? Number(seg.endTime)
        : st + (Number(seg.duration) || 0);
    if (t + 1e-6 >= st && t <= en + 1e-3 && st >= bestStart) {
      bestStart = st;
      best = seg;
    }
  }
  return best || list[0] || null;
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

  const setPlaybackState = useConversationStore((s) => s.setPlaybackState);
  const conversation = useConversationStore((s) => s.conversation);
  const isPlaying = useConversationStore((s) => s.isPlaying);
  const currentTime = useConversationStore((s) => s.currentTime);
  const playbackRate =
    useConversationStore((s) => s.playbackRate) || 1;

  const totalDuration = Number(conversation?.totalDuration) || 0;

  const pushPlaybackUi = useCallback(
    (globalSec, opts) => {
      const state = useConversationStore.getState();
      const segs = sortedSegments(state.segments);
      const tr = state.transcript;
      const total = Number(state.conversation?.totalDuration) || 0;
      const clamped = Math.max(0, Math.min(globalSec, total));
      const pinnedId = opts?.segmentId != null ? String(opts.segmentId) : null;
      const segFromAudio = pinnedId
        ? segs.find((s) => s._id?.toString() === pinnedId)
        : null;
      const seg = segFromAudio ?? findSegmentAtGlobalTime(segs, clamped);
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
        const seg = findSegmentAtGlobalTime(segs, globalSec);
        const total = Number(state.conversation?.totalDuration) || 0;
        const clamped = Math.max(0, Math.min(globalSec, total));
        if (!seg?.fileUrl || !audioRef.current) {
          pushPlaybackUi(clamped);
          resolve();
          return;
        }
        const st = Number(seg.startTime) || 0;
        const offset = Math.max(0, clamped - st);
        const a = audioRef.current;
        const segKey = seg._id?.toString();

        a.playbackRate = rate;

        const startPlayback = () => {
          a.currentTime = offset;
          pushPlaybackUi(st + offset, { segmentId: segKey });
          if (andPlay) {
            a.play().catch(() => {});
            setPlaybackState({ isPlaying: true });
          }
          resolve();
        };

        if (loadedSegmentIdRef.current !== segKey) {
          loadedSegmentIdRef.current = segKey;
          a.pause();
          a.src = seg.fileUrl;
          a.load();
          const onReady = () => {
            a.removeEventListener("loadedmetadata", onReady);
            a.removeEventListener("error", onErr);
            startPlayback();
          };
          const onErr = () => {
            a.removeEventListener("loadedmetadata", onReady);
            a.removeEventListener("error", onErr);
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
      const segId = loadedSegmentIdRef.current;
      const segs = sortedSegments(state.segments);
      const seg = segs.find((s) => s._id?.toString() === segId);
      if (!seg) return;
      const st = Number(seg.startTime) || 0;
      const ct = Number.isFinite(a.currentTime) ? a.currentTime : 0;
      const globalT = st + ct;
      pushPlaybackUi(globalT, { segmentId: segId });
    };

    const onEnded = () => {
      const state = useConversationStore.getState();
      const rate = state.playbackRate || 1;
      const order = sortedSegments(state.segments);
      const curId = loadedSegmentIdRef.current;
      const idx = order.findIndex((s) => s._id?.toString() === curId);
      const next = idx >= 0 ? order[idx + 1] : null;
      const total = Number(state.conversation?.totalDuration) || 0;

      if (next?.fileUrl) {
        loadedSegmentIdRef.current = next._id.toString();
        const a2 = audioRef.current;
        a2.pause();
        a2.src = next.fileUrl;
        a2.load();
        a2.addEventListener(
          "loadedmetadata",
          () => {
            a2.currentTime = 0;
            a2.playbackRate = rate;
            pushPlaybackUi(Number(next.startTime) || 0, {
              segmentId: next._id,
            });
            a2.play().catch(() => {});
            setPlaybackState({ isPlaying: true });
          },
          { once: true },
        );
      } else {
        setPlaybackState({ isPlaying: false });
        pushPlaybackUi(total);
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
    const total = Number(state.conversation?.totalDuration) || 0;
    if (total <= 0 || !sortedSegments(state.segments).some((s) => s.fileUrl))
      return;

    if (playing) {
      audioRef.current?.pause();
      setPlaybackState({ isPlaying: false });
      return;
    }

    let t = state.currentTime || 0;
    if (t >= total - 0.05) t = 0;

    loadAudioAtGlobalTime(t, true);
  }, [loadAudioAtGlobalTime, setPlaybackState]);

  const seekBy = useCallback(
    (deltaSec) => {
      const state = useConversationStore.getState();
      const total = Number(state.conversation?.totalDuration) || 0;
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
  };
}
