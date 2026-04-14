

const useConversationStore = create((set) => ({
    splitView: false,
    setSplitView: (splitView) => set({ splitView }),

}))

export default useConversationStore;