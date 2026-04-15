import { create } from 'zustand';

export const useRecordingStore = create((set, get) => ({
  // State structure
  isRecording: false,
  isPaused: false,
  duration: 0,
  title: '[Untitled]',
  
  mediaRecorder: null,
  stream: null,
  intervalId: null,

  // Actions
  startRecording: (stream, mediaRecorder) => {
    // Clear any existing interval to prevent memory leaks
    const existingIntervalId = get().intervalId;
    if (existingIntervalId) {
      clearInterval(existingIntervalId);
    }

    const id = setInterval(() => {
      get().incrementDuration();
    }, 1000);

    set({
      isRecording: true,
      isPaused: false,
      duration: 0, // Reset duration on fresh start
      stream,
      mediaRecorder,
      intervalId: id,
    });
  },

  pauseRecording: () => {
    const { mediaRecorder, intervalId } = get();
    // Safely attempt to pause MediaRecorder
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
    }
    // Clear timer interval
    if (intervalId) {
      clearInterval(intervalId);
    }
    
    set({ isPaused: true, intervalId: null });
  },

  resumeRecording: () => {
    const { mediaRecorder } = get();
    // Safely attempt to resume MediaRecorder
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
    }
    
    // Restart timer interval
    const id = setInterval(() => {
      get().incrementDuration();
    }, 1000);
    
    set({ isPaused: false, intervalId: id });
  },

  stopRecording: () => {
    const { mediaRecorder, stream, intervalId } = get();
    
    // Safely attempt to stop MediaRecorder
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    // Properly clean up microphone tracks
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    // Clear timer interval
    if (intervalId) {
      clearInterval(intervalId);
    }
    
    set({
      isRecording: false,
      isPaused: false,
      duration: 0,
      mediaRecorder: null,
      stream: null,
      intervalId: null,
    });
  },

  incrementDuration: () => {
    set((state) => ({ duration: state.duration + 1 }));
  },

  setTitle: (title) => {
    set({ title });
  },

  reset: () => {
    get().stopRecording(); // Reset does exact same cleanup
  }
}));
