import { create } from 'zustand';

/**
 * Recording Store
 * Manages the MediaRecorder lifecycle, audio chunk accumulation, and recording state.
 */
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

            // FIX 4: Set ondataavailable BEFORE starting the recorder to prevent race conditions
            // where the first chunk is emitted before the handler is attached.
            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    set((state) => {
                        const updated = [...state.audioChunks, event.data];
                        return { audioChunks: updated };
                    });
                }
            };

            // timeslice = 1000ms: Captures data in 1-second intervals to avoid large memory spikes.
            recorder.start(1000); 

            // ✅ FORCE CHUNK FLUSH
            // interval = 1000ms: Periodically requests data from the recorder to ensure chunks 
            // are actively being pushed to the store during long recording sessions.
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
                audioChunks: [], // Clean reset of chunks for the new session
                isRecording: true,
                isPaused: false,
                duration: 0,
                intervalId: timer,
                flushInterval
            });

        } catch (err) {
            console.error("[RecordingStore] startRecording failed:", err);
        }
    },

    // ✅ PAUSE
    pauseRecording: () => {
        const { mediaRecorder, intervalId, flushInterval } = get();

        // Guard: if mediaRecorder state is not "recording", return early with a warning log
        if (mediaRecorder?.state !== "recording") {
            console.warn("[RecordingStore] pauseRecording called but recorder is not recording. Current state:", mediaRecorder?.state);
            return;
        }

        // requestData MUST be called before pause() to flush buffered 
        // audio. Without this, the last buffered chunk is lost on pause.
        try {
            mediaRecorder.requestData();
        } catch (e) {
            console.error("[RecordingStore] Failed to flush buffered audio before pause:", e);
        }

        mediaRecorder.pause();

        if (intervalId) clearInterval(intervalId);
        if (flushInterval) clearInterval(flushInterval);

        set({ 
            isPaused: true, 
            isRecording: true, // explicitly — session is still active
            intervalId: null, 
            flushInterval: null 
        });
    },

    // ✅ RESUME
    resumeRecording: () => {
        const { mediaRecorder } = get();
        
        // Guard: prevents orphaned timers and silent failures
        if (!mediaRecorder || mediaRecorder.state !== "paused") {
            console.warn("[RecordingStore] resumeRecording called but recorder is not in paused state. Current state:", mediaRecorder?.state);
            return;
        }

        mediaRecorder.resume();

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

        set({ 
            isPaused: false, 
            isRecording: true, 
            intervalId: timer, 
            flushInterval: newFlushInterval 
        });
    },

    // ✅ STOP RECORDING
    stopRecording: async () => {
        const { mediaRecorder, mediaStream, intervalId, flushInterval } = get();
        const capturedDuration = get().duration; // capture before any state wipe

        if (!mediaRecorder) return { blob: null, duration: 0 };

        // PAUSED STATE HANDLING — if user paused then confirmed:
        // Resume briefly to allow final chunk to be emitted before stopping.
        if (mediaRecorder.state === "paused") {
            try {
                mediaRecorder.resume();
                await new Promise(r => setTimeout(r, 150));
                mediaRecorder.requestData();
                await new Promise(r => setTimeout(r, 100));
            } catch (e) {
                console.warn("[RecordingStore] Could not flush paused recorder:", e);
            }
        } else if (mediaRecorder.state === "recording") {
            try {
                mediaRecorder.requestData();
                await new Promise(r => setTimeout(r, 100));
            } catch (e) {
                console.warn("[RecordingStore] Could not flush recording recorder:", e);
            }
        }

        return new Promise((resolve, reject) => {
            mediaRecorder.onstop = () => {
                try {
                    const allChunks = get().audioChunks;
                    const blob = new Blob(allChunks, { type: 'audio/webm' });

                    if (!blob || blob.size === 0) {
                        throw new Error("[RecordingStore] Empty audio blob generated");
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

                    // Return object with both blob and final duration
                    resolve({ blob, duration: capturedDuration });
                } catch (err) {
                    console.error("[RecordingStore] stopRecording failed in onstop:", err);
                    reject(err);
                }
            };

            // ✅ TRIGGER STOP
            if (mediaRecorder.state !== "inactive") {
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