import { create } from 'zustand';

/**
 * Recording Store
 * Manages the MediaRecorder lifecycle, audio chunk accumulation, and recording state.
 */
export const useRecordingStore = create((set, get) => {
    const createRecorder = (stream) => {
        const recorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm'
        });

        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                set((state) => ({
                    audioChunks: [...state.audioChunks, event.data]
                }));
            }
        };

        return recorder;
    };

    const startTicking = (recorder) => {
        const timer = setInterval(() => {
            set((s) => ({ duration: s.duration + 1 }));
        }, 1000);

        const flushInterval = setInterval(() => {
            try {
                if (recorder?.state === 'recording') {
                    recorder.requestData();
                }
            } catch (e) {
                // Ignore DOMException if recorder is not in a valid state
            }
        }, 1000);

        return { timer, flushInterval };
    };

    const getPreferredAudioStream = async (deviceId) => {
        if (deviceId) {
            try {
                return await navigator.mediaDevices.getUserMedia({
                    audio: { deviceId: { exact: deviceId } }
                });
            } catch (err) {
                console.warn('[RecordingStore] Requested device unavailable, falling back to default input:', err);
            }
        }

        return navigator.mediaDevices.getUserMedia({ audio: true });
    };

    return ({
    mediaRecorder: null,
    mediaStream: null,
    audioChunks: [],
    availableDevices: [],
    selectedDeviceId: null,
    devicePermissionDenied: false,
    isSwitchingInput: false,
    isRecording: false,
    isPaused: false,
    duration: 0,
    intervalId: null,
    flushInterval: null,

    // ✅ START RECORDING
    startRecording: async () => {
        if (get().isRecording) return;

        try {
            const stream = await getPreferredAudioStream(get().selectedDeviceId);
            const recorder = createRecorder(stream);

            // timeslice = 1000ms: Captures data in 1-second intervals to avoid large memory spikes.
            recorder.start(1000);
            const { timer, flushInterval } = startTicking(recorder);

            set({
                mediaRecorder: recorder,
                mediaStream: stream,
                audioChunks: [], // Clean reset of chunks for the new session
                selectedDeviceId: stream.getAudioTracks()?.[0]?.getSettings?.().deviceId || get().selectedDeviceId,
                devicePermissionDenied: false,
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

        const { timer, flushInterval: newFlushInterval } = startTicking(mediaRecorder);

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
    },

    loadDevices: async () => {
        if (typeof navigator === 'undefined' || !navigator?.mediaDevices?.enumerateDevices) return;

        const currentStream = get().mediaStream;
        let permissionStream = null;

        try {
            if (!currentStream) {
                permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter((d) => d.kind === 'audioinput');
            const existingSelection = get().selectedDeviceId;
            const hasExisting = audioInputs.some((d) => d.deviceId === existingSelection);
            const selectedDeviceId = hasExisting
                ? existingSelection
                : audioInputs[0]?.deviceId || null;

            set({
                availableDevices: audioInputs,
                selectedDeviceId,
                devicePermissionDenied: false
            });
        } catch (err) {
            console.error('[RecordingStore] loadDevices failed:', err);
            set({
                availableDevices: [],
                selectedDeviceId: null,
                devicePermissionDenied: true
            });
        } finally {
            permissionStream?.getTracks().forEach((track) => track.stop());
        }
    },

    setDevice: (deviceId) => {
        set({ selectedDeviceId: deviceId || null });
    },

    restartRecordingWithDevice: async (deviceId) => {
        const {
            isRecording,
            mediaRecorder,
            mediaStream,
            isPaused,
            intervalId,
            flushInterval
        } = get();

        if (!isRecording || !mediaRecorder) {
            set({ selectedDeviceId: deviceId || null });
            return;
        }

        set({ isSwitchingInput: true, selectedDeviceId: deviceId || null });

        if (intervalId) clearInterval(intervalId);
        if (flushInterval) clearInterval(flushInterval);

        try {
            if (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused') {
                try {
                    mediaRecorder.requestData();
                    await new Promise((r) => setTimeout(r, 120));
                } catch (e) {
                    console.warn('[RecordingStore] Failed flushing before input switch:', e);
                }
            }

            await new Promise((resolve) => {
                mediaRecorder.onstop = () => resolve();
                if (mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                } else {
                    resolve();
                }
            });

            mediaStream?.getTracks().forEach((track) => track.stop());

            const newStream = await getPreferredAudioStream(deviceId);
            const newRecorder = createRecorder(newStream);
            newRecorder.start(1000);

            let nextTimer = null;
            let nextFlushInterval = null;

            if (isPaused) {
                newRecorder.pause();
            } else {
                const ticking = startTicking(newRecorder);
                nextTimer = ticking.timer;
                nextFlushInterval = ticking.flushInterval;
            }

            set({
                mediaRecorder: newRecorder,
                mediaStream: newStream,
                isRecording: true,
                isPaused,
                intervalId: nextTimer,
                flushInterval: nextFlushInterval,
                selectedDeviceId: newStream.getAudioTracks()?.[0]?.getSettings?.().deviceId || deviceId || null,
                devicePermissionDenied: false
            });
        } catch (err) {
            console.error('[RecordingStore] restartRecordingWithDevice failed:', err);
            set({
                mediaRecorder: null,
                mediaStream: null,
                isRecording: false,
                isPaused: false,
                intervalId: null,
                flushInterval: null,
                selectedDeviceId: null
            });
        } finally {
            set({ isSwitchingInput: false });
        }
    }
});
});