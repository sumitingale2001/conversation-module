'use client';

import React from 'react';
import { 
    Check, ChevronDown, Gem, Mic, Play, RotateCw, RefreshCw 
} from 'lucide-react';
import useConversationStore from '../../../../../store/conversation.store';
import StaticWaveform from './static-waveform';

const RecordingPanel = ({ 
    timer, 
    handleReset, 
    handleConfirm, 
    handlePauseToggle, 
    isPaused 
}) => {
    const { conversation } = useConversationStore();
    const isProcessing = conversation?.status === "processing";

    return (
        <div className="mx-auto w-full max-w-3xl rounded-xl bg-white shadow-md ring-1 ring-gray-200">
            <div className="flex items-center justify-between px-5 py-3">
                <div className="text-lg font-semibold tabular-nums text-gray-900">{timer || "00:00:00"}</div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleReset}
                        disabled={isProcessing}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-900 disabled:opacity-50"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            <div className="px-5 pb-2">
                <StaticWaveform />
            </div>

            <div className="flex items-center justify-between px-5 pb-2 pt-1">
                <button className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-900 disabled:opacity-50" disabled={isProcessing}>
                    1x <ChevronDown className="h-3 w-3" />
                </button>
                <div className="flex items-center gap-3">
                    <button className="relative text-gray-500 disabled:opacity-50" disabled={isProcessing}>
                        <RotateCw className="h-5 w-5 -scale-x-100" />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold">5</span>
                    </button>
                    <button className="flex h-8 w-8 items-center justify-center text-gray-900 disabled:opacity-50" disabled={isProcessing}>
                        <Play className="h-5 w-5 fill-current" />
                    </button>
                    <button className="relative text-gray-500 disabled:opacity-50" disabled={isProcessing}>
                        <RotateCw className="h-5 w-5" />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold">5</span>
                    </button>
                </div>
                <button className="text-blue-600 disabled:opacity-50" disabled={isProcessing}>
                    <Gem className="h-5 w-5" strokeWidth={1.75} />
                </button>
            </div>

            <div className="flex items-center justify-between px-5 pb-4 pt-2">
                <button className="flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-xs disabled:opacity-50" disabled={isProcessing}>
                    <Mic className="h-3.5 w-3.5" />
                    <ChevronDown className="h-3 w-3" />
                </button>
                <button 
                    onClick={handlePauseToggle}
                    disabled={isProcessing}
                    className="rounded-md border border-gray-200 px-6 py-1.5 font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                    {isProcessing ? "Processing..." : (isPaused ? "Resume" : "Pause")}
                </button>
                <span className="w-12" />
            </div>
        </div>
    );
};

export default RecordingPanel;
