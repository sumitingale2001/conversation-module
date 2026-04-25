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
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const recorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            });

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    set((state) => {
                        const updated = [...state.audioChunks, event.data];
                        return { audioChunks: updated };
                    });
                }
            };

            recorder.start(1000); // emit every second

            // ✅ FORCE CHUNK FLUSH (CRITICAL FIX)
            const flushInterval = setInterval(() => {
                try {
                    if (recorder.state === "recording") {
                        recorder.requestData();
                    }
                } catch (e) {
                    // Ignore DOMException if recorder is not in a valid state
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
            console.error("startRecording failed:", err);
        }
    },

    // ✅ PAUSE
    pauseRecording: () => {
        const { mediaRecorder, intervalId, flushInterval } = get();

        if (mediaRecorder?.state === "recording") {
            mediaRecorder.pause();
        }

        if (intervalId) clearInterval(intervalId);
        if (flushInterval) clearInterval(flushInterval);

        set({ isPaused: true, intervalId: null, flushInterval: null });
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

        const newFlushInterval = setInterval(() => {
            try {
                if (mediaRecorder?.state === "recording") {
                    mediaRecorder.requestData();
                }
            } catch (err) {
                // Ignore
            }
        }, 1000);

        set({ isPaused: false, intervalId: timer, flushInterval: newFlushInterval });
    },

    // ✅ STOP RECORDING (FIXED PROPERLY)
    stopRecording: async () => {
        const { mediaRecorder, mediaStream, intervalId, flushInterval } = get();

        return new Promise((resolve, reject) => {
            if (!mediaRecorder) return resolve(null);

            mediaRecorder.onstop = () => {
                try {
                    const allChunks = get().audioChunks;
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