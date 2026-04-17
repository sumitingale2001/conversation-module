'use client';

import React, { useState } from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import useConversationStore from '../../../../../store/conversation.store';
import TranscriptCard from './transcript-card';
import RecordingPanel from './recording-panel';

const RecordingExperience = () => {
    // Basic local wiring reflecting previous placeholder logic tracking 
    const [isPaused, setIsPaused] = useState(false);
    const [timer, setTimer] = useState("00:00:00");
    
    const setConversationStatus = useConversationStore(state => state.setConversationStatus);

    const handleReset = () => {
        // Tie to abort/reset logic 
        setTimer("00:00:00");
        setIsPaused(false);
    };

    const handleConfirm = () => {
        // Trigger completion via store status explicitly 
        if (setConversationStatus) {
            setConversationStatus("processing");
            setTimeout(() => {
                setConversationStatus("completed");
            }, 2000);
        }
    };

    const handlePauseToggle = () => {
        setIsPaused(!isPaused);
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-50/30">
            {/* SubHeader */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-2">
                <span className="text-sm font-medium text-gray-800">Transcript</span>
                <div className="flex items-center gap-3 text-gray-500">
                    <button><Undo2 className="h-4 w-4" /></button>
                    <button><Redo2 className="h-4 w-4" /></button>
                </div>
            </div>

            {/* Scroll Area */}
            <main className="flex-1 overflow-y-auto px-6 py-6">
                <TranscriptCard />
            </main>

            {/* Bottom Section */}
            <div className="px-6 pb-6">
                <RecordingPanel 
                    timer={timer}
                    isPaused={isPaused}
                    handleReset={handleReset}
                    handleConfirm={handleConfirm}
                    handlePauseToggle={handlePauseToggle}
                />
            </div>
        </div>
    );
};

export default RecordingExperience;
