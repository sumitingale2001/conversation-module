import { create } from 'zustand';

export const useRecordingStore = create((set, get) => ({
    mediaRecorder: null,
    mediaStream: null,
    audioChunks: [],
    isRecording: false,
    isPaused: false,
    duration: 0,
    intervalId: null,
    flushInterval: null,

    // ✅ START RECORDING
    startRecording: async () => {
        if (get().isRecording) return;

        try {
            console.log("🎬 START RECORDING");

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            stream.getTracks().forEach(track => {
                console.log("🎤 Track:", track.kind, track.readyState);
            });

            const recorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            });

            // ✅ IMPORTANT: DO NOT OVERRIDE LATER
            recorder.ondataavailable = (event) => {
                console.log("🔥 DATA EVENT SIZE:", event.data?.size);

                if (event.data && event.data.size > 0) {
                    set((state) => {
                        const updated = [...state.audioChunks, event.data];
                        console.log("✅ CHUNKS LENGTH:", updated.length);
                        return { audioChunks: updated };
                    });
                }
            };

            recorder.onstart = () => console.log("▶️ Recording started");
            recorder.onpause = () => console.log("⏸ Recording paused");
            recorder.onresume = () => console.log("▶️ Recording resumed");
            recorder.onstop = () => console.log("⛔ Recording stopped");

            recorder.start(1000); // emit every second

            // ✅ FORCE CHUNK FLUSH (CRITICAL FIX)
            const flushInterval = setInterval(() => {
                if (recorder.state === "recording") {
                    console.log("⚡ forcing requestData()");
                    recorder.requestData();
                }
            }, 1000);

            const timer = setInterval(() => {
                set((s) => ({ duration: s.duration + 1 }));
            }, 1000);

            set({
                mediaRecorder: recorder,
                mediaStream: stream,
                audioChunks: [], // reset cleanly
                isRecording: true,
                isPaused: false,
                duration: 0,
                intervalId: timer,
                flushInterval
            });

        } catch (err) {
            console.error("❌ startRecording failed:", err);
        }
    },

    // ✅ PAUSE
    pauseRecording: () => {
        const { mediaRecorder, intervalId } = get();

        if (mediaRecorder?.state === "recording") {
            mediaRecorder.pause();
        }

        if (intervalId) clearInterval(intervalId);

        set({ isPaused: true, intervalId: null });
    },

    // ✅ RESUME
    resumeRecording: () => {
        const { mediaRecorder } = get();

        if (mediaRecorder?.state === "paused") {
            mediaRecorder.resume();
        }

        const timer = setInterval(() => {
            set((s) => ({ duration: s.duration + 1 }));
        }, 1000);

        set({ isPaused: false, intervalId: timer });
    },

    // ✅ STOP RECORDING (FIXED PROPERLY)
    stopRecording: async () => {
        const { mediaRecorder, mediaStream, intervalId, flushInterval, audioChunks } = get();

        return new Promise((resolve, reject) => {
            if (!mediaRecorder) return resolve(null);

            const finalChunks = [];

            const handleFinalChunk = (event) => {
                console.log("🧩 FINAL CHUNK:", event.data?.size);
                if (event.data && event.data.size > 0) {
                    finalChunks.push(event.data);
                }
            };

            // ✅ ADD LISTENER (DO NOT OVERRIDE)
            mediaRecorder.addEventListener('dataavailable', handleFinalChunk);

            mediaRecorder.onstop = () => {
                try {
                    mediaRecorder.removeEventListener('dataavailable', handleFinalChunk);

                    const allChunks = [...audioChunks, ...finalChunks];

                    console.log("🎯 FINAL CHUNKS:", allChunks.length);

                    const blob = new Blob(allChunks, { type: 'audio/webm' });

                    if (!blob || blob.size === 0) {
                        throw new Error("Empty audio blob generated");
                    }

                    // cleanup
                    mediaStream?.getTracks().forEach(track => track.stop());
                    if (intervalId) clearInterval(intervalId);
                    if (flushInterval) clearInterval(flushInterval);

                    set({
                        mediaRecorder: null,
                        mediaStream: null,
                        audioChunks: [],
                        isRecording: false,
                        isPaused: false,
                        duration: 0,
                        intervalId: null,
                        flushInterval: null
                    });

                    resolve(blob);
                } catch (err) {
                    console.error("❌ stopRecording error:", err);
                    reject(err);
                }
            };

            // ✅ FORCE LAST DATA
            if (mediaRecorder.state !== "inactive") {
                try {
                    if (mediaRecorder.state === "recording") {
                        mediaRecorder.requestData();
                    }
                } catch (e) {
                    console.warn("requestData ignored:", e);
                }
                mediaRecorder.stop();
            } else {
                mediaRecorder.onstop();
            }
        });
    },

    // ✅ RESET
    reset: () => {
        const { mediaStream, intervalId, flushInterval } = get();

        mediaStream?.getTracks().forEach(track => track.stop());
        if (intervalId) clearInterval(intervalId);
        if (flushInterval) clearInterval(flushInterval);

        set({
            mediaRecorder: null,
            mediaStream: null,
            audioChunks: [],
            isRecording: false,
            isPaused: false,
            duration: 0,
            intervalId: null,
            flushInterval: null
        });
    }
}));