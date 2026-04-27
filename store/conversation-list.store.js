import { create } from "zustand";

/**
 * Conversation list store.
 * Holds listing data, pagination, active filter, and loading/error UI state.
 */
const initialState = {
  conversations: [],
  pagination: null,
  filter: "recent",
  isLoading: false,
  error: null,
};

const useConversationListStore = create((set) => ({
  ...initialState,

  setConversations: (conversations, pagination) =>
    set({
      conversations: Array.isArray(conversations) ? conversations : [],
      pagination: pagination || null,
    }),

  setFilter: (filter) => set({ filter }),

  setLoading: (isLoading) => set({ isLoading: Boolean(isLoading) }),

  setError: (error) => set({ error }),

  reset: () => set({ ...initialState }),
}));

export default useConversationListStore;
