'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GripVertical, Mic } from 'lucide-react';
import useConversationStore from '../../../../../store/conversation.store';
import { useRecordingStore } from '../../../../../store/recording.store';
import { conversationServices } from '../../../../../services/conversationServices';
import { workspaceId } from '../../../../../utils/conversation.utils';
import useGetConversation from '../../../../../hooks/use-get-conversation';

const formatTimer = (seconds) => {
    if (!seconds) return "00:00:00";
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const generateTicks = (totalDuration, count = 11) => {
    if (!totalDuration || totalDuration <= 0) {
        return Array.from({ length: count }, (_, i) =>
            (0.31 + i * 0.054).toFixed(2)
        );
    }
    return Array.from({ length: count }, (_, i) =>
        ((totalDuration / (count - 1)) * i).toFixed(1)
    );
};

/** Bar geometry in CSS pixels (canvas scales with container × DPR) */
const BAR_W_CSS = 2;
const GAP_CSS = 0.85;

const WAVEFORM_BG = '#E3E3E4';
const BAR_FILL = '#979797';

const StaticWaveform = ({ mediaStream }) => {
    const canvasRef = useRef(null);
    const requestRef = useRef(null);
    const audioContextRef = useRef(null);
    const isPausedRef = useRef(false);
    const durationRef = useRef(0);

    const { conversation, segments } = useConversationStore();
    const { duration, title, isPaused } = useRecordingStore();
    const { getConversation } = useGetConversation();

    // Drag reorder state
    const [orderedSegments, setOrderedSegments] = useState([]);
    const [dragIndex, setDragIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [isReordering, setIsReordering] = useState(false);

    const isLive = !!(mediaStream && mediaStream.getAudioTracks().length > 0);
    const totalDuration = conversation?.totalDuration || 0;
    const ticks = generateTicks(totalDuration);

    // Sync ordered segments from store
    useEffect(() => {
        if (segments?.length) {
            const sorted = [...segments].sort((a, b) => (a.order || 0) - (b.order || 0));
            setOrderedSegments(sorted);
        } else {
            setOrderedSegments([]);
        }
    }, [segments]);

    // Live bar waveform (Figma-style gray bars; static pattern when paused)
    useEffect(() => {
        if (!isLive || !canvasRef.current) return;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.38;
        analyser.minDecibels = -92;
        analyser.maxDecibels = -22;

        const source = audioContext.createMediaStreamSource(mediaStream);
        source.connect(analyser);

        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        const parentEl = canvas.parentElement;
        const layoutRef = { cssW: 400 };

        const resizeCanvas = () => {
            if (!parentEl) return;
            const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
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
        const ro = typeof ResizeObserver !== 'undefined' && parentEl ? new ResizeObserver(resizeCanvas) : null;
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
                if (typeof canvasCtx.roundRect === 'function') {
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
                    const b1 = Math.min(freqBins - 1, Math.ceil((fHigh / nyquist) * freqBins));

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
        };

        draw();

        return () => {
            ro?.disconnect();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
        };
    }, [isLive, mediaStream]);

    // Drag handlers
    const handleDragStart = (e, index) => {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
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
                segmentIds: reordered.map(s => s._id),
            });
            if (res?.success) {
                await getConversation({
                    conversationId: conversation?._id,
                    workspaceId,
                    silent: true,
                });
            }
        } catch {
            const sorted = [...segments].sort((a, b) => (a.order || 0) - (b.order || 0));
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

    return (
        <div className="relative w-full select-none">
            {/* ── OUTER WAVEFORM CONTAINER ─────────────────────────────────── */}
            <div className="relative h-24 w-full overflow-hidden rounded-lg border border-gray-200 bg-[#F3F4F6] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                
                {/* Fixed center line — recording grows left from here (instant / live) */}
                <div className="pointer-events-none absolute inset-y-0 left-1/2 z-30 w-px -translate-x-1/2 bg-red-500/85 shadow-[0_0_6px_rgba(239,68,68,0.45)]" />

                {isLive ? (
                    /* ── STATE 2: chip right edge at center playhead, width grows toward the left ── */
                    <div className="pointer-events-none absolute inset-y-2 left-2 right-2 z-10">
                        <div
                            className="absolute inset-y-0 overflow-hidden rounded-l-lg rounded-r-none border border-[#C6C6C7] border-r-0 bg-[#E3E3E4] shadow-sm pointer-events-auto"
                            style={{
                                left: `calc(50% - ${chipWidthPct}%)`,
                                width: `${chipWidthPct}%`,
                            }}
                        >
                            <div className="absolute left-0 right-0 top-0 z-20 flex items-center gap-1.5 border-b border-[#8E9092] bg-[#A1A3A5] px-3 pb-1.5 pt-2">
                                <GripVertical className="h-3 w-3 shrink-0 text-[#262626]" />
                                <Mic className="h-3 w-3 shrink-0 text-[#262626]" />
                                <span className="max-w-[200px] truncate text-xs font-semibold tracking-tight text-[#262626]">
                                    {title || "[Untitled]"}
                                </span>
                                <div className="flex-1" />
                                <span className="font-mono text-[10px] tracking-tight text-[#262626]">
                                    {formatTimer(duration)}
                                </span>
                            </div>

                            <div className="absolute inset-x-0 bottom-0 top-9 z-10 bg-[#E3E3E4]">
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
                                    border-[#C6C6C7] bg-[#E3E3E4] shadow-sm
                                    transition-all duration-150 active:cursor-grabbing
                                    ${dragOverIndex === index && dragIndex !== index
                                        ? 'z-20 scale-[1.01] border-primary ring-2 ring-primary/20'
                                        : ''
                                    }
                                    ${dragIndex === index ? 'opacity-40 grayscale' : 'opacity-100'}
                                `}
                                style={{
                                    flex: `${seg.duration || 1} 1 0%`,
                                }}
                            >
                                {/* Chip header */}
                                <div className="flex shrink-0 items-center gap-1.5 border-b border-[#8E9092] bg-[#A1A3A5] px-2.5 pb-1 pt-2 z-10">
                                    <GripVertical className="h-3 w-3 text-[#262626]" />
                                    <Mic className="h-3 w-3 text-[#262626]" />
                                    <span className="truncate text-[11px] font-semibold text-[#262626]">
                                        {seg.name || `Recording ${index + 1}`}
                                    </span>
                                    <div className="flex-1" />
                                    <span className="font-mono text-[10px] text-[#262626]">
                                        {formatTimer(seg.duration)}
                                    </span>
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

            {/* ── TIMELINE RULER ───────────────────────────────────────────── */}
            <div className="mt-2 flex flex-col gap-1 px-0.5">
                <div className="flex h-2 items-end justify-between border-x border-gray-200/90">
                    {Array.from({ length: 11 }).map((_, i) => (
                        <div key={i} className={`w-px bg-gray-300/90 ${i % 5 === 0 ? 'h-full' : 'h-1/2'}`} />
                    ))}
                </div>
                <div className="flex justify-between text-[10px] font-medium tabular-nums text-gray-500">
                    {ticks.map((t, i) => (
                        <span key={i} className="w-8 text-center first:text-left last:text-right">{t}</span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StaticWaveform;
