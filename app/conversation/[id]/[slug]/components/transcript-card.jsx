'use client';

import React from 'react';
import { ChevronUp, MoreHorizontal, FileText, Loader2 } from 'lucide-react';
import useConversationStore from '../../../../../store/conversation.store';

const formatMs = (ms) => {
    if (!ms && ms !== 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const TranscriptCard = () => {
    const { conversation, segments, transcript } = useConversationStore();

    const isProcessing = conversation?.status === "processing";
    const isCompleted = conversation?.status === "completed";
    const title = segments?.[0]?.name || conversation?.title || "[Untitled]";

    const hasBlocks = transcript?.blocks?.length > 0;
    const activeBlocks = transcript?.blocks?.filter(b => b.isActive && !b.isDeleted) || [];

    const statusLabel = isProcessing
        ? "Processing recording..."
        : isCompleted
            ? `Transcribed · ${segments?.[0]?.duration ?? 0}s`
            : "Recording in-progress";

    return (
        <div className={`mx-auto w-full max-w-3xl rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-opacity ${isProcessing ? 'opacity-80 pointer-events-none' : ''}`}>
            {/* Card Header */}
            <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-100">
                <div className="flex items-start gap-2">
                    <button className="mt-0.5 text-gray-400" disabled={isProcessing}>
                        <ChevronUp className="h-4 w-4" />
                    </button>
                    <div>
                        <div className="text-sm font-semibold text-gray-900">{title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{statusLabel}</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="text-sm font-semibold text-blue-600 disabled:opacity-40" disabled={isProcessing || isCompleted}>
                        Transcribe
                    </button>
                    <button className="text-gray-400 disabled:opacity-40" disabled={isProcessing}>
                        <MoreHorizontal className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Card Body */}
            {isProcessing ? (
                /* Processing empty state */
                <div className="flex flex-col items-center justify-center px-6 py-16">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 mb-4">
                        <Loader2 className="h-9 w-9 text-white animate-spin" strokeWidth={2} />
                    </div>
                    <p className="max-w-sm text-center text-sm leading-relaxed text-gray-500">
                        Please wait while we finalize the audio capture and extract sequence data...
                    </p>
                </div>
            ) : hasBlocks ? (
                /* Transcript blocks */
                <div className="px-5 py-4 flex flex-col gap-1">
                    {activeBlocks.map((block) => (
                        <div key={block._id} className="group flex gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
                            <span className="mt-0.5 shrink-0 text-[11px] font-mono text-gray-300 group-hover:text-gray-400 w-10 text-right">
                                {formatMs(block.startTimeMs)}
                            </span>
                            <p className="text-sm leading-relaxed text-gray-800">
                                {block.text}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                /* Empty state — no transcript yet */
                <div className="flex flex-col items-center justify-center px-6 py-16">
                    <div className="relative mb-4">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400">
                            <FileText className="h-9 w-9 text-white" strokeWidth={2} />
                        </div>
                        <span className="absolute -left-2 -top-1 text-blue-600">✦</span>
                        <span className="absolute -right-1 top-2 text-blue-600">✦</span>
                    </div>
                    <p className="max-w-sm text-center text-sm leading-relaxed text-gray-500">
                        Your transcript will appear here once processing is complete.
                    </p>
                </div>
            )}
        </div>
    );
};

export default TranscriptCard;
