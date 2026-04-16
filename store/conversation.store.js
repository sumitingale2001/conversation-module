import { create } from "zustand";

const useConversationStore = create((set) => ({
    // 1. Core Data
    conversation: null,
    segments: [],
    tags: [],

    // 2. UI State
    viewMode: "left", // "split" | "left" | "right"
    isLoading: true,
    isProcessing: false,
    selectedRange: null, // { start: number, end: number } | null
    activeSegmentId: null,

    // 3. Playback State
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,

    // 4. Actions
    setTimeline: (data) => set(() => ({
        conversation: data.conversation !== undefined ? data.conversation : null,
        segments: data.segments || [],
        tags: data.tags || []
    })),

    setConversation: (conversation) => set((state) => ({
        conversation: state.conversation ? { ...state.conversation, ...conversation } : conversation
    })),

    setViewMode: (viewMode) => set({ viewMode }),

    setIsLoading: (isLoading) => set({ isLoading }),

    setProcessing: (isProcessing) => set({ isProcessing }),

    setSelectedRange: (selectedRange) => set({ selectedRange }),

    setPlaybackState: (updates) => set(updates)
}));

export default useConversationStore;