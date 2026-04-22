"use client";

import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';
import { Play, Pause, Mic, Check, RotateCcw, RotateCw, RefreshCw, Wand2, ChevronDown, Sparkles, GripVertical, Undo, Redo } from 'lucide-react';
import { useRecordingStore } from '../../../../../store/recording.store';

const Transcript = () => {
    // Bind store state & actions
    const {
        isRecording,
        isPaused,
        duration,
        title,
        setTitle,
        stream,
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
    } = useRecordingStore();

    // Waveform refs
    const waveformRef = useRef(null);
    const wavesurferRef = useRef(null);
    const recordPluginRef = useRef(null);
    const micStreamRef = useRef(null);

    // Format time (HH:MM:SS)
    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Initialize Waveform Container
    useEffect(() => {
        if (waveformRef.current && !wavesurferRef.current) {
            wavesurferRef.current = WaveSurfer.create({
                container: waveformRef.current,
                waveColor: '#d1d5db',
                progressColor: '#ef4444',
                cursorColor: '#ef4444',
                barWidth: 2,
                barGap: 3,
                barRadius: 2,
                height: 60,
            });

            // Init record plugin purely for waveform rendering
            recordPluginRef.current = wavesurferRef.current.registerPlugin(
                RecordPlugin.create({
                    scrollingWaveform: true,
                    renderRecordedAudio: false
                })
            );
        }

        return () => {
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
                wavesurferRef.current = null;
            }
        };
    }, []);

    const startRecordLogic = async () => {
        try {
            // Store handles stream and recorder instantiation (Single Owner)
            const mediaStream = await startRecording();
            if (!mediaStream) return;

            // WaveSurfer ONLY visualizes the store's stream
            if (recordPluginRef.current) {
                micStreamRef.current = recordPluginRef.current.renderMicStream(mediaStream);
            }
        } catch (err) {
            console.error("Failed to start recording:", err);
            alert("Microphone access is required to record audio.");
        }
    };

    const handleMainAction = () => {
        if (!isRecording) {
            startRecordLogic();
        } else if (isRecording && !isPaused) {
            pauseRecording();
            if (micStreamRef.current) {
                micStreamRef.current.destroy(); // Fix: use destroy() instead of onDestroy()
                micStreamRef.current = null;
            }
        } else if (isRecording && isPaused) {
            resumeRecording();
            // Store maintains stream, retrieve it to resume visualization
            const currentStream = useRecordingStore.getState().mediaStream;
            if (currentStream && recordPluginRef.current) {
                micStreamRef.current = recordPluginRef.current.renderMicStream(currentStream);
            }
        }
    };

    const handleStopCleanly = async () => {
        // Wait for MediaRecorder to finish and return Blob
        const blob = await stopRecording();
        
        // Stop UI visualization cleanly
        if (micStreamRef.current) {
            micStreamRef.current.destroy(); // Fix from onDestroy to destroy()
            micStreamRef.current = null;
        }

        // Emit blob or proceed with finalization flow
        if (blob) {
            console.log("Blob generated successfully:", blob);
            // S3 Upload and Backend Finalization would occur here
        }
    };

    useEffect(() => {
        return () => {
            handleStopCleanly();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            {/* <div className="flex items-center  justify-between">
                <p className="text-lg font-bold leading-[24px] text-gray-800 tracking-wide">Transcript</p>
                <div className="flex items-center gap-2">

                    <Undo className="cursor-pointer opacity-50" size={20} />
                    <Redo className="cursor-pointer opacity-50" size={20} />
                </div>
            </div> */}
            <div className="flex flex-col items-center justify-center min-h-[500px] w-full p-5">
                <div className="w-full max-w-[600px] bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden mt-20">

                    {/* Top: Timer + Done button */}
                    <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
                        <div className="w-10"></div> {/* spacer for perfect centering */}
                        <div className="text-xl font-bold text-gray-800 tracking-wide">
                            {formatTime(duration)}
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors"
                                onClick={handleStopCleanly}
                                title="Reset"
                            >
                                <RefreshCw size={18} />
                            </button>
                            <button
                                className="p-2 bg-[#2E3192] text-white rounded-lg hover:bg-[#252876] transition-colors shadow-sm"
                                onClick={handleStopCleanly}
                                title="Done"
                            >
                                <Check size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    {/* Middle: waveform area */}
                    <div className="px-6 py-8 bg-[#F8F9FB] relative border-b border-gray-50">

                        {/* Center vertical indicator simulating timeline cursor */}
                        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
                            <div className="w-[1.5px] h-16 bg-[#ef4444] opacity-80 z-10 absolute left-1/2 -translate-x-1/2"></div>
                        </div>

                        {/* Active Segment UI / Editable Title */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white shadow-sm rounded-md px-3 py-2 flex items-center gap-2 z-20 pointer-events-auto border border-gray-100/50">
                            <GripVertical size={14} className="text-gray-400 cursor-grab active:cursor-grabbing" />
                            <Mic size={14} className="text-gray-500" />
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="bg-transparent outline-none border-none text-sm font-medium w-[120px] text-gray-700 placeholder-gray-400"
                                placeholder="[Untitled]"
                            />
                        </div>

                        {/* Real-time waveform container */}
                        <div ref={waveformRef} className="w-full relative z-1 h-[60px] opacity-90 mix-blend-multiply"></div>
                    </div>

                    {/* Bottom controls */}
                    <div className="px-6 py-4 flex flex-col gap-4">
                        <div className="flex justify-between items-center w-full">

                            {/* Mic selector (basic for now) */}
                            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                                <Mic size={15} className="text-gray-500" />
                                <ChevronDown size={14} className="text-gray-400" />
                            </button>

                            {/* Play/Speed controls block */}
                            <div className="flex items-center gap-5">

                                <button className="flex items-center gap-1 px-3 py-1 border border-gray-200 rounded-full text-xs text-gray-400 font-semibold hover:bg-gray-50 hover:text-gray-600 transition-colors">
                                    1x <ChevronDown size={12} strokeWidth={2.5} />
                                </button>

                                <button className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors">
                                    <RotateCcw size={20} strokeWidth={2} />
                                </button>

                                <button
                                    onClick={handleMainAction}
                                    className={`w-12 h-12 flex items-center justify-center rounded-full transition-all shadow-sm
                  ${(!isRecording || isPaused)
                                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                                >
                                    {(!isRecording || isPaused) ? <Play size={20} className="ml-1" fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                                </button>

                                <button className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors">
                                    <RotateCw size={20} strokeWidth={2} />
                                </button>

                            </div>

                            {/* Sparkles / Magic wand */}
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors">
                                <Sparkles size={18} />
                            </button>

                        </div>

                        <div className="flex justify-center mt-[-8px] pb-2">
                            <button
                                onClick={handleMainAction}
                                className="px-5 py-1.5 border border-gray-200 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
                            >
                                {isRecording && !isPaused ? 'Pause' : (isRecording && isPaused ? 'Resume' : 'Start')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Transcript;