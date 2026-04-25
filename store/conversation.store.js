import { create } from "zustand";

/**
 * DERIVED LOGIC HELPER
 * Maps tags to segments based on timestamp alignment.
 * Strictly follows the contract: tag.timestamp >= segment.startTime && tag.timestamp <= segment.endTime
 */
const mapTagsToSegments = (segments, tags) => {
    if (!segments || !Array.isArray(segments)) return [];
    const safeTags = Array.isArray(tags) ? tags : [];

    return segments.map((segment) => ({
        ...segment,
        tags: safeTags.filter(
            (tag) => 
                tag.timestamp >= segment.startTime && 
                tag.timestamp <= segment.endTime
        ),
    }));
};

const useConversationStore = create((set, get) => ({
    // --- 1. CORE DATA ---
    conversation: null,
    segments: [],
    tags: [],
    transcript: null,
    
    // --- 2. DERIVED DATA (CRITICAL) ---
    mappedSegments: [],

    // --- 3. UI STATE ---
    viewMode: "left", // "left" | "split" | "right"
    isLoading: false,
    selectedRange: null,
    activeSegmentId: null,

    // --- 4. PLAYBACK STATE ---
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,

    // --- 5. ACTIONS ---

    /**
     * setTimeline(data)
     * Sets core data and immediately computes derived mappedSegments
     */
    setTimeline: (data) => {
        const conversation = data?.conversation || null;
        const segments = data?.segments || [];
        const tags = data?.tags || [];
        const transcript = data?.transcript || null;

        set({
            conversation,
            segments,
            tags,
            transcript,
            mappedSegments: mapTagsToSegments(segments, tags)
        });
    },

    /**
     * setConversation(updates)
     * Merges updates into existing conversation object
     */
    setConversation: (updates) => {
        set((state) => ({
            conversation: state.conversation 
                ? { ...state.conversation, ...updates } 
                : updates
        }));
    },

    /**
     * refreshMapping()
     * Recomputes mappedSegments from current segments and tags
     */
    refreshMapping: () => {
        const { segments, tags } = get();
        set({
            mappedSegments: mapTagsToSegments(segments, tags)
        });
    },

    /**
     * setPlaybackState(updates)
     * Updates playback related properties
     */
    setPlaybackState: (updates) => {
        set((state) => ({
            ...state,
            ...updates
        }));
    },

    // --- 6. UI ACTIONS (BACKWARD COMPATIBILITY) ---
    setViewMode: (viewMode) => set({ viewMode }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setSelectedRange: (selectedRange) => set({ selectedRange }),
    setActiveSegmentId: (activeSegmentId) => set({ activeSegmentId }),
    
    /**
     * Generic UI State setter
     */
    setUIState: (updates) => {
        set((state) => ({
            ...state,
            ...updates
        }));
    }
}));

export default useConversationStore;