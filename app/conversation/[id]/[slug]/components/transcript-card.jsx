'use client';

import React from 'react';
import { ChevronUp, MoreHorizontal, FileText, Loader2 } from 'lucide-react';
import useConversationStore from '../../../../../store/conversation.store';

const TranscriptCard = () => {
    const { conversation } = useConversationStore();

    const isProcessing = conversation?.status === "processing";
    const title = conversation?.title || "[Untitled]";
    const status = isProcessing 
        ? "Processing recording..." 
        : "Recording in-progress";

    return (
        <div className={`mx-auto w-full max-w-3xl rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-opacity ${isProcessing ? 'opacity-80 pointer-events-none' : ''}`}>
            <div className="flex items-start justify-between px-5 pt-4">
                <div className="flex items-start gap-2">
                    <button className="mt-0.5 text-gray-500 disabled:opacity-50" disabled={isProcessing}>
                        <ChevronUp className="h-4 w-4" />
                    </button>
                    <div>
                        <div className="text-sm font-semibold text-gray-900">{title}</div>
                        <div className="text-xs text-gray-500">{status}</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="text-sm font-semibold text-blue-600 disabled:opacity-50" disabled={isProcessing}>Transcribe</button>
                    <button className="text-gray-500 disabled:opacity-50" disabled={isProcessing}>
                        <MoreHorizontal className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center px-6 py-16">
                <div className="relative mb-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400">
                        {isProcessing ? (
                            <Loader2 className="h-9 w-9 text-white animate-spin" strokeWidth={2} />
                        ) : (
                            <FileText className="h-9 w-9 text-white" strokeWidth={2} />
                        )}
                    </div>
                    {!isProcessing && (
                        <>
                            <span className="absolute -left-2 -top-1 text-blue-600">✦</span>
                            <span className="absolute -right-1 top-2 text-blue-600">✦</span>
                        </>
                    )}
                </div>
                <p className="max-w-sm text-center text-sm leading-relaxed text-gray-500">
                    {isProcessing 
                        ? "Please wait while we finalize the audio capture and extract sequence data..." 
                        : "Lorem ipsum dolor sit amet consectetur. Vitae gravida sed duis consectetur pharetra dignissim sem."}
                </p>
            </div>
        </div>
    );
};

export default TranscriptCard;
