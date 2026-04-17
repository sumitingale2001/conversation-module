'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import HoverPlugin from 'wavesurfer.js/dist/plugins/hover.esm.js';
import { Play, Pause, FastForward, Rewind, MoreVertical, Edit2, Clock } from 'lucide-react';
import useConversationStore from '../../../../../store/conversation.store';



function formatTime(seconds) {
    if(!seconds) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// 2. VirtualMediaEngine for Logical Timeline Mapping
class VirtualTimelineAudio extends EventTarget {
    constructor(segments) {
        super();
        this.segments = segments || [];
        // Ensure segments are properly ordered from start to finish
        this.segments.sort((a,b) => (a.startTime || 0) - (b.startTime || 0));
        
        // Logical engine boundary scaling calculations
        this.globalDuration = this.segments.length > 0 ? Math.max(...this.segments.map(s => s.endTime || 0)) : 10;
        
        // Single Physical Audio Node constraint
        this.audio = typeof window !== 'undefined' ? new window.Audio() : null;
        this._paused = true;
        this._currentTime = 0;
        this.activeSegment = null;

        if (this.audio) {
            this.audio.crossOrigin = "anonymous";
            
            // Sync underlying physics back to virtual engine
            this.audio.addEventListener('timeupdate', () => {
                if (this.activeSegment && !this._paused) {
                    this._currentTime = this.activeSegment.startTime + this.audio.currentTime;
                    this.dispatchEvent(new Event('timeupdate'));
                }
            });
            this.audio.addEventListener('ended', () => {
                this._playNextSegment();
            });
            this.audio.addEventListener('play', () => {
                this._paused = false;
                this.dispatchEvent(new Event('play'));
            });
            this.audio.addEventListener('pause', () => {
                if (this._paused) this.dispatchEvent(new Event('pause'));
            });
        }
    }

    // Required DuckTypes for WaveSurfer Hooks
    get duration() { return this.globalDuration || 0.1; }
    get currentTime() { return this._currentTime; }
    set currentTime(time) {
        this._currentTime = Math.max(0, Math.min(time, this.globalDuration));
        this._syncAudio();
        this.dispatchEvent(new Event('timeupdate'));
    }

    get paused() { return this._paused; }
    get playbackRate() { return this.audio ? this.audio.playbackRate : 1; }
    set playbackRate(val) { 
        if (this.audio) this.audio.playbackRate = val; 
        this.dispatchEvent(new Event('ratechange')); 
    }
    get muted() { return this.audio ? this.audio.muted : false; }
    set muted(val) { 
        if (this.audio) this.audio.muted = val; 
        this.dispatchEvent(new Event('volumechange')); 
    }
    get volume() { return this.audio ? this.audio.volume : 1; }
    set volume(val) { 
        if (this.audio) this.audio.volume = val; 
        this.dispatchEvent(new Event('volumechange')); 
    }
    get src() { return ''; }
    set src(val) { /* Block WaveSurfer overwriting global structural layout src */ }

    async play() {
        if (!this.audio) return Promise.resolve();
        this._paused = false;
        this.dispatchEvent(new Event('play'));
        this._syncAudio();

        if (this.activeSegment && this.audio.src) {
            return this.audio.play();
        } else {
             this._playNextSegment();
             return Promise.resolve();
        }
    }

    pause() {
        if (!this.audio) return;
        this._paused = true;
        this.audio.pause();
        this.dispatchEvent(new Event('pause'));
    }

    _syncAudio() {
        if (!this.audio) return;
        const seg = this.segments.find(s => this._currentTime >= s.startTime && this._currentTime < s.endTime);
        
        if (seg) {
            this.activeSegment = seg;
            const targetSrc = seg.audioUrl || seg.mediaUrl || '';
            
            // Sequential partial loading
            if (targetSrc && !this.audio.src.endsWith(targetSrc)) {
                this.audio.src = targetSrc;
            }
            
            const offset = this._currentTime - seg.startTime;
            if (Math.abs(this.audio.currentTime - offset) > 0.2) {
                this.audio.currentTime = offset;
            }
        } else {
            this.activeSegment = null;
            this.audio.pause();
            this.audio.removeAttribute('src'); 
        }
    }

    _playNextSegment() {
         const next = this.segments.find(s => s.startTime >= this._currentTime + 0.1);
         if (next) {
             this.currentTime = next.startTime;
             if (!this._paused) this.play();
         } else {
             this.pause();
             this.currentTime = this.globalDuration;
             this.dispatchEvent(new Event('ended'));
         }
    }
}

const WaveformTimeline = ({ 
    setWsInstance,
    conversation, 
    segments, 
    tags, 
    setIsPlaying, 
    setCurrentTime,
    setDuration,
    setSelectedRange,
    onAddTag
}) => {
    const containerRef = useRef(null);
    const timelineRef = useRef(null);
    const wsRef = useRef(null);
    const regionsRef = useRef(null);
    const virtualAudioRef = useRef(null);

    // Tag Popup State
    const [showTagPopup, setShowTagPopup] = useState(false);
    const [tagTime, setTagTime] = useState(0);
    const [tagLabel, setTagLabel] = useState("");

    useEffect(() => {
        if (!containerRef.current) return;

        const virtualAudio = new VirtualTimelineAudio(segments);
        virtualAudioRef.current = virtualAudio;

        const ws = WaveSurfer.create({
            container: containerRef.current,
            waveColor: '#d1d5db',
            progressColor: '#3b82f6', 
            cursorColor: '#ef4444', 
            cursorWidth: 2,
            barWidth: 2,
            barGap: 3,
            barRadius: 2,
            height: 100,
            normalize: true,
            media: virtualAudio,
            plugins: [
                TimelinePlugin.create({
                    container: timelineRef.current,
                    height: 24,
                    timeInterval: 5,
                    primaryLabelInterval: 10,
                    style: {
                        fontSize: '10px',
                        color: '#6b7280'
                    }
                }),
                HoverPlugin.create({
                    lineColor: '#ef4444',
                    lineWidth: 1,
                    labelBackground: '#4b5563',
                    labelColor: '#fff',
                    labelSize: '11px',
                })
            ]
        });

        const regions = ws.registerPlugin(RegionsPlugin.create());
        regionsRef.current = regions;
        wsRef.current = ws;
        setWsInstance(ws);

        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));
        ws.on('timeupdate', (currentTime) => setCurrentTime(currentTime));
        ws.on('ready', (duration) => {
            setDuration(duration);
            regions.enableDragSelection({
                color: 'rgba(59, 130, 246, 0.2)', 
            });
        });

        // 🎯 FLOW: 1. User clicks timeline -> strictly extracting engine timestamp (no manual calc)
        ws.on('click', () => {
            const preciseTimelineTime = ws.getCurrentTime();
            setTagTime(preciseTimelineTime);
            setTagLabel("");
            setShowTagPopup(true);
        });

        regions.on('region-created', (region) => {
            regions.getRegions().forEach(r => {
                if (r.id !== region.id && r.data?.isSelection) {
                    r.remove()
                }
            })
            region.setOptions({ data: { isSelection: true, ...region.data } });
            setSelectedRange({ start: region.start, end: region.end })
        });
        
        regions.on('region-updated', (region) => {
            if (region.data?.isSelection) {
                setSelectedRange({ start: region.start, end: region.end })
            }
        });

        Promise.resolve().then(() => ws.load('', [[0]], virtualAudio.duration));

        return () => {
            if (virtualAudio) virtualAudio.pause();
            ws.destroy();
            setWsInstance(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [segments]);

    useEffect(() => {
        if (!regionsRef.current || !wsRef.current) return;
        const regions = regionsRef.current;
        
        regions.getRegions().forEach(r => {
            if (!r.data?.isSelection) r.remove();
        });

        if (segments && Array.isArray(segments)) {
            segments.forEach((seg, i) => {
                if (seg.startTime !== undefined && seg.endTime !== undefined) {
                    regions.addRegion({
                        start: seg.startTime,
                        end: seg.endTime,
                        color: 'rgba(34, 197, 94, 0.1)', 
                        drag: false,
                        resize: false,
                        content: `<div class="text-xs font-semibold text-green-700 bg-green-50/80 px-1 rounded border border-green-200 mt-1 max-w-full overflow-hidden truncate whitespace-nowrap">${seg.title || `Segment ${i+1}`}</div>`,
                        data: { isSelection: false } 
                    });
                }
            });
        }

        if (tags && Array.isArray(tags)) {
            tags.forEach(tag => {
                if (tag.time !== undefined) {
                    regions.addRegion({
                        start: tag.time,
                        end: tag.time,
                        color: 'rgba(239, 68, 68, 0.7)', 
                        drag: false,
                        resize: false,
                        content: `<div class="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap absolute -top-6 left-1/2 -translate-x-1/2">${tag.label || 'Tag'}</div>`,
                        data: { isSelection: false }
                    });
                }
            });
        }
    }, [segments, tags]);

    return (
        <div className="w-full flex-1 relative">
            <div ref={timelineRef} className="w-full mb-1"></div>
            <div ref={containerRef} className="w-full relative cursor-crosshair"></div>

            {/* 🎯 FLOW: 2 & 3. Open drag popup -> Select/create tag */}
            {showTagPopup && (
                <div className="absolute top-[40%] left-1/2 -translate-x-1/2 z-50 bg-white shadow-xl border border-gray-200 rounded-lg p-3 flex flex-col gap-3 min-w-[220px]">
                    <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
                        <span>Add Tag at</span>
                        <span className="font-mono bg-gray-100 px-1 rounded">{formatTime(tagTime)}</span>
                    </div>
                    <input 
                        value={tagLabel}
                        onChange={(e) => setTagLabel(e.target.value)}
                        className="border border-gray-300 rounded text-sm px-2 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                        placeholder="Tag label..." 
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && tagLabel.trim()) {
                                onAddTag({ time: tagTime, label: tagLabel.trim() });
                                setShowTagPopup(false);
                            } else if (e.key === 'Escape') {
                                setShowTagPopup(false);
                            }
                        }}
                    />
                    <div className="flex gap-2 justify-end">
                        <button 
                            onClick={() => setShowTagPopup(false)} 
                            className="text-xs font-medium text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => {
                                if(tagLabel.trim()) onAddTag({ time: tagTime, label: tagLabel.trim() });
                                setShowTagPopup(false);
                            }} 
                            className="text-xs font-medium bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                            disabled={!tagLabel.trim()}
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// 4. Controls (bottom)
const Controls = ({ wsInstance, isPlaying, playbackRate, setPlaybackRate }) => {
    const handlePlayPause = () => {
        if (wsInstance) {
            wsInstance.playPause();
        }
    }

    const seek = (seconds) => {
        if (wsInstance) {
            const currentTime = wsInstance.getCurrentTime();
            const duration = wsInstance.getDuration();
            let newTime = currentTime + seconds;
            newTime = Math.max(0, Math.min(newTime, duration));
            wsInstance.setTime(newTime);
        }
    }

    const handleSpeedChange = () => {
        if (!wsInstance) return;
        const rates = [1, 1.25, 1.5, 2, 0.5];
        const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
        setPlaybackRate(nextRate);
        wsInstance.setPlaybackRate(nextRate);
    }

    return (
        <div className="flex justify-between items-center w-full p-4 bg-white border border-gray-200 rounded-lg shadow-sm mt-auto">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => seek(-5)}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                >
                    <Rewind size={20} />
                </button>
                <button 
                    onClick={handlePlayPause}
                    className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-md active:scale-95"
                >
                    {isPlaying ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor" />}
                </button>
                <button 
                    onClick={() => seek(5)}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                >
                    <FastForward size={20} />
                </button>
            </div>

            <div className="flex items-center gap-3">
                <button 
                    onClick={handleSpeedChange}
                    className="px-3 py-1.5 border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 focus:ring-2 focus:ring-gray-200"
                >
                    {playbackRate}x Speed
                </button>
                <button className="px-5 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors shadow-sm focus:ring-2 focus:ring-gray-900">
                    Replace
                </button>
            </div>
        </div>
    )
}

// Main Editor Composer
const TimelineEditor = () => {
    const { 
        conversation, segments, tags, 
        isPlaying, playbackRate,
        setPlaybackState, setSelectedRange, setTimeline
    } = useConversationStore();

    const [wsInstance, setWsInstance] = useState(null);

    const setIsPlaying = useCallback((play) => setPlaybackState({ isPlaying: play }), [setPlaybackState]);
    const setCurrentTime = useCallback((time) => setPlaybackState({ currentTime: time }), [setPlaybackState]);
    const setDuration = useCallback((dur) => setPlaybackState({ duration: dur }), [setPlaybackState]);
    const setPlaybackRateStore = useCallback((rate) => setPlaybackState({ playbackRate: rate }), [setPlaybackState]);

    const handleAddTag = useCallback((newTag) => {
        // FLOW 4. Save timestamp -> Sync to store preserving backend state context tracking
        setTimeline({
            conversation,
            segments,
            tags: [...(tags || []), { _id: Date.now().toString(), time: newTag.time, label: newTag.label }]
        });
    }, [conversation, segments, tags, setTimeline]);

    return (
        <div className="w-full h-full flex flex-col gap-4">            
            <WaveformTimeline 
                setWsInstance={setWsInstance}
                conversation={conversation}
                segments={segments}
                tags={tags}
                setIsPlaying={setIsPlaying}
                setCurrentTime={setCurrentTime}
                setDuration={setDuration}
                setSelectedRange={setSelectedRange}
                onAddTag={handleAddTag}
            />

            <Controls 
                wsInstance={wsInstance} 
                isPlaying={isPlaying} 
                playbackRate={playbackRate || 1} 
                setPlaybackRate={setPlaybackRateStore} 
            />
        </div>
    );
};

export default TimelineEditor;
