import { create } from "zustand";


const useConversationStore = create((set) => ({
    splitView: false,
    setSplitView: (splitView) => set({ splitView }),
    isLoading: true,
    setIsLoading: (isLoading) => set({ isLoading }),
    
    conversation: null,
    setConversation: (conversation) => set({ conversation }),
    updateConversation: (updates) => set((state) => ({
        conversation: state.conversation ? { ...state.conversation, ...updates } : updates
    })),

}))

export default useConversationStore;