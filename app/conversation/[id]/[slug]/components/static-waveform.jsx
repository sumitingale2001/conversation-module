'use client';

import React from 'react';

const StaticWaveform = () => {
    const ticks = Array.from({ length: 11 }, (_, i) => (0.31 + i * 0.054).toFixed(2));
    return (
        <div className="relative">
            <div className="relative h-24 overflow-hidden rounded-md bg-gray-100">
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gray-800/70" />
                <div className="absolute inset-y-2 left-1/2 w-0.5 -translate-x-1/2 rounded bg-gray-900" />
            </div>
            <div className="mt-1 flex justify-between px-1 text-[10px] text-gray-500">
                {ticks.map((t) => (
                    <span key={t}>{t}</span>
                ))}
            </div>
        </div>
    );
};

export default StaticWaveform;
