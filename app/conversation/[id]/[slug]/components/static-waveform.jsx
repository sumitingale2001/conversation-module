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

const StaticWaveform = ({ mediaStream }) => {
    const canvasRef = useRef(null);
    const requestRef = useRef(null);
    const audioContextRef = useRef(null);

    const { conversation, segments } = useConversationStore();
    const { duration, title } = useRecordingStore();
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

    // Live waveform canvas
    useEffect(() => {
        if (!isLive || !canvasRef.current) return;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        const source = audioContext.createMediaStreamSource(mediaStream);
        source.connect(analyser);

        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            requestRef.current = requestAnimationFrame(draw);
            analyser.getByteTimeDomainData(dataArray);

            canvasCtx.fillStyle = 'rgb(31, 41, 55)'; // bg-gray-800
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = 'rgb(34, 197, 94)';
            canvasCtx.beginPath();

            const sliceWidth = canvas.width / bufferLength;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvas.height) / 2;
                i === 0 ? canvasCtx.moveTo(x, y) : canvasCtx.lineTo(x, y);
                x += sliceWidth;
            }
            canvasCtx.lineTo(canvas.width, canvas.height / 2);
            canvasCtx.stroke();
        };

        draw();

        return () => {
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

    return (
        <div className="relative w-full select-none">
            {/* ── OUTER WAVEFORM CONTAINER ─────────────────────────────────── */}
            <div className="relative w-full h-24 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                
                {/* Red playhead — always centered */}
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-red-500/80 z-30 pointer-events-none shadow-[0_0_4px_rgba(239,68,68,0.5)]" />

                {isLive ? (
                    /* ── STATE 2: ACTIVE RECORDING — centered chip wraps waveform ── */
                    <div className="absolute inset-y-2 left-0 right-0 flex justify-center z-10 pointer-events-none px-4">
                        <div className="relative w-full max-w-2xl h-full rounded-md overflow-hidden bg-gray-800 shadow-sm border border-gray-700 pointer-events-auto">
                            
                            {/* Chip header row */}
                            <div className="absolute top-0 left-0 right-0 flex items-center gap-1.5 px-3 pt-2 pb-1 z-20">
                                <GripVertical className="h-3 w-3 text-gray-500 shrink-0" />
                                <Mic className="h-3 w-3 text-gray-400 shrink-0" />
                                <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                                    {title || "[Untitled]"}
                                </span>
                                <div className="flex-1" />
                                <span className="text-[10px] text-gray-400 font-mono tracking-tight">
                                    {formatTimer(duration)}
                                </span>
                            </div>

                            {/* Live waveform canvas fills chip */}
                            <canvas
                                ref={canvasRef}
                                className="absolute inset-0 h-full w-full opacity-90"
                                width={800}
                                height={96}
                            />
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
                                    relative flex flex-col rounded-md overflow-hidden
                                    bg-gray-800 border select-none cursor-grab active:cursor-grabbing
                                    transition-all duration-150 min-w-[140px]
                                    ${dragOverIndex === index && dragIndex !== index
                                        ? 'border-primary ring-2 ring-primary/20 scale-[1.01] z-20'
                                        : 'border-gray-700'
                                    }
                                    ${dragIndex === index ? 'opacity-40 grayscale' : 'opacity-100'}
                                `}
                                style={{
                                    flex: `${seg.duration || 1} 1 0%`,
                                }}
                            >
                                {/* Chip header */}
                                <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-0.5 shrink-0 z-10">
                                    <GripVertical className="h-3 w-3 text-gray-500" />
                                    <Mic className="h-3 w-3 text-gray-400" />
                                    <span className="text-[11px] font-semibold text-white truncate">
                                        {seg.name || `Recording ${index + 1}`}
                                    </span>
                                    <div className="flex-1" />
                                    <span className="text-[10px] text-gray-400 font-mono">
                                        {formatTimer(seg.duration)}
                                    </span>
                                </div>

                                {/* Static waveform bars */}
                                <div className="flex-1 flex items-center justify-center px-3 pb-1.5">
                                    <div className="flex items-center gap-0.5 h-full w-full">
                                        {Array.from({ length: 32 }).map((_, i) => {
                                            // Seed random with seg._id for stability
                                            const seed = seg._id.charCodeAt(i % seg._id.length);
                                            const h = 20 + Math.abs(Math.sin(i * 0.5 + seed)) * 50 + (seed % 20);
                                            return (
                                                <div
                                                    key={i}
                                                    className="flex-1 bg-gray-500/40 rounded-sm"
                                                    style={{ height: `${h}%` }}
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
            <div className="mt-2 flex flex-col gap-1.5 px-1">
                {/* Tick marks */}
                <div className="flex justify-between items-end h-2 border-x border-gray-200">
                    {Array.from({ length: 11 }).map((_, i) => (
                        <div key={i} className={`w-px bg-gray-200 ${i % 5 === 0 ? 'h-full' : 'h-1/2'}`} />
                    ))}
                </div>
                {/* Timestamps */}
                <div className="flex justify-between text-[10px] font-medium text-gray-400">
                    {ticks.map((t, i) => (
                        <span key={i} className="w-8 text-center first:text-left last:text-right">{t}</span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StaticWaveform;
