'use client';

import React from 'react';
import { ChevronUp, MoreHorizontal, FileText } from 'lucide-react';
import useConversationStore from '../../../../../store/conversation.store';

const TranscriptCard = () => {
    const { conversation } = useConversationStore();

    const title = conversation?.title || "[Untitled]";
    const status = conversation?.status === "processing" 
        ? "Processing recording..." 
        : "Recording in-progress";

    return (
        <div className="mx-auto w-full max-w-3xl rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="flex items-start justify-between px-5 pt-4">
                <div className="flex items-start gap-2">
                    <button className="mt-0.5 text-gray-500">
                        <ChevronUp className="h-4 w-4" />
                    </button>
                    <div>
                        <div className="text-sm font-semibold text-gray-900">{title}</div>
                        <div className="text-xs text-gray-500">{status}</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="text-sm font-semibold text-blue-600">Transcribe</button>
                    <button className="text-gray-500">
                        <MoreHorizontal className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center px-6 py-16">
                <div className="relative mb-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400">
                        <FileText className="h-9 w-9 text-white" strokeWidth={2} />
                    </div>
                    <span className="absolute -left-2 -top-1 text-blue-600">✦</span>
                    <span className="absolute -right-1 top-2 text-blue-600">✦</span>
                </div>
                <p className="max-w-sm text-center text-sm leading-relaxed text-gray-500">
                    Lorem ipsum dolor sit amet consectetur. Vitae gravida sed duis consectetur pharetra dignissim sem.
                </p>
            </div>
        </div>
    );
};

export default TranscriptCard;
