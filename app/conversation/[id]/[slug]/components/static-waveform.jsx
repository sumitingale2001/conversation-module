'use client';

import React, { useEffect, useRef } from 'react';

const StaticWaveform = ({ mediaStream }) => {
    const canvasRef = useRef(null);
    const requestRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);

    useEffect(() => {
        if (!mediaStream || mediaStream.getAudioTracks().length === 0) {
            return;
        }

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

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
            canvasCtx.strokeStyle = 'rgb(34, 197, 94)'; // green-500

            canvasCtx.beginPath();

            const sliceWidth = canvas.width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * canvas.height / 2;

                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            canvasCtx.lineTo(canvas.width, canvas.height / 2);
            canvasCtx.stroke();
        };

        draw();

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
            if (audioContextRef.current?.state !== 'closed') {
                audioContextRef.current?.close();
            }
        };
    }, [mediaStream]);

    const ticks = Array.from({ length: 11 }, (_, i) => (0.31 + i * 0.054).toFixed(2));

    if (!mediaStream || mediaStream.getAudioTracks().length === 0) {
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
    }

    return (
        <div className="relative">
            <div className="relative h-24 overflow-hidden rounded-md bg-gray-800">
                <canvas 
                    ref={canvasRef} 
                    className="absolute inset-0 h-full w-full" 
                    width={800} 
                    height={96}
                />
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
