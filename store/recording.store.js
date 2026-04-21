import { create } from 'zustand';

/**
 * RECORDING ENGINE STORE
 * Manages the entire MediaRecorder lifecycle globally to ensure persistent access
 * and consistent state across components.
 */
export const useRecordingStore = create((set, get) => ({
    // --- 1. STATE ---
    mediaRecorder: null,
    mediaStream: null,
    audioChunks: [],
    isRecording: false,
    isPaused: false,
    duration: 0,
    intervalId: null,

    // --- 2. ACTIONS ---

    /**
     * startRecording()
     * Handles permissions, stream initialization, and recorder event binding.
     * Updated with 1000ms timeslice to ensure continuous chunk emission.
     */
    startRecording: async () => {
        // Prevent overlapping recordings
        if (get().isRecording) return;

        try {
            // STEP A: REQUEST PERMISSION & GET STREAM
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // STEP B: INITIALIZE RECORDER
            const recorder = new MediaRecorder(stream);
            const chunks = [];

            // STEP C: BIND EVENT HANDLERS (Collect Chunks)
            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            // STEP D: START RECORDING
            // 🔥 FIX: Added 1000ms timeslice to ensure ondataavailable fires regularly
            recorder.start(1000);

            // STEP E: START TIMER (Increment duration every second)
            if (get().intervalId) clearInterval(get().intervalId);
            const timerId = setInterval(() => {
                set((state) => ({ duration: state.duration + 1 }));
            }, 1000);

            set({
                mediaRecorder: recorder,
                mediaStream: stream,
                audioChunks: chunks,
                isRecording: true,
                isPaused: false,
                duration: 0,
                intervalId: timerId
            });

            return stream; // Returns stream for visualizers (like Wavesurfer)
        } catch (error) {
            console.error("Recording Engine failed to start:", error);
            throw error;
        }
    },

    /**
     * pauseRecording()
     * Suspends the collector and stops the timer.
     */
    pauseRecording: () => {
        const { mediaRecorder, intervalId } = get();
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
        }
        if (intervalId) clearInterval(intervalId);
        set({ isPaused: true, intervalId: null });
    },

    /**
     * resumeRecording()
     * Resumes the collector and restarts the timer.
     */
    resumeRecording: () => {
        const { mediaRecorder } = get();
        if (mediaRecorder && mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
        }
        
        const timerId = setInterval(() => {
            set((state) => ({ duration: state.duration + 1 }));
        }, 1000);

        set({ isPaused: false, intervalId: timerId });
    },

    /**
     * stopRecording()
     * Stops the recorder and returns the final Blob via Promise.
     * Updated to force a final data flush before stopping.
     */
    stopRecording: async () => {
        const { mediaRecorder, mediaStream, audioChunks, intervalId } = get();

        return new Promise((resolve, reject) => {
            if (!mediaRecorder) {
                return resolve(null);
            }

            // Bind onstop BEFORE calling stop()
            mediaRecorder.onstop = () => {
                try {
                    // Create blob from collected chunks
                    const blob = new Blob(audioChunks, { type: 'audio/webm' });

                    // Edge Case: Check for empty blob (e.g. <300ms recording)
                    if (!blob || blob.size === 0) {
                        throw new Error("Empty audio blob generated");
                    }

                    // Cleanup Mic Tracks
                    if (mediaStream) {
                        mediaStream.getTracks().forEach(track => track.stop());
                    }

                    // Clear Timer
                    if (intervalId) clearInterval(intervalId);

                    // RESET STORE
                    set({
                        mediaRecorder: null,
                        mediaStream: null,
                        audioChunks: [],
                        isRecording: false,
                        isPaused: false,
                        duration: 0,
                        intervalId: null
                    });

                    resolve(blob);
                } catch (err) {
                    console.error("Payload generation failed:", err);
                    reject(err);
                }
            };

            // Trigger stop
            if (mediaRecorder.state !== 'inactive') {
                // 🔥 FIX: Force final chunk emission before stopping
                mediaRecorder.requestData();
                mediaRecorder.stop();
            } else {
                // If already inactive, trigger onstop manually if browser hasn't or return existing chunks
                mediaRecorder.onstop();
            }
        });
    },

    /**
     * reset()
     * Emergency cleanup and state reset.
     */
    reset: () => {
        const { mediaStream, intervalId } = get();
        if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
        if (intervalId) clearInterval(intervalId);
        
        set({
            mediaRecorder: null,
            mediaStream: null,
            audioChunks: [],
            isRecording: false,
            isPaused: false,
            duration: 0,
            intervalId: null
        });
    }
}));
