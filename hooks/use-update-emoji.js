"use client";

import { useState, useCallback } from "react";
import ApiService from "../services";
import useLoading from "./use-loading";
import useConversationStore from "../store/conversation.store";

const useUpdateEmoji = () => {
    const { setLoading: setIsLoading, loading: isLoading } = useLoading();
    const [error, setError] = useState(null);

    const setConversation = useConversationStore((state) => state.setConversation);

    const updateEmoji = useCallback(async (payload) => {
        // Fetch current emoji directly from store to guarantee no closure staleness during debounces
        const currentConversation = useConversationStore.getState().conversation;
        const previousEmoji = currentConversation?.emoji;

        // High-Frequency Safety check: Prevent network overhead if emoji hasn't changed.
        // Extremely important for elements like Emoji Pickers that rapidly dispatch updates in short succession.
        if (payload.emoji === previousEmoji) return;

        setIsLoading(true);
        setError(null);

        try {
            // 1. Immediate optimistic UI sync
            setConversation({ ...currentConversation, emoji: payload.emoji });

            const body = {
                conversationId: payload.conversationId,
                workspaceId: payload.workspaceId,
                emoji: payload.emoji,
            };

            // 2. Perform external persist call
            await ApiService.updateConversationEmoji(body);

            setIsLoading(false);
        } catch (err) {
            // 3. Guaranteed Rollback pattern using accurate local buffer
            setConversation({ ...currentConversation, emoji: previousEmoji });
            
            setError(err);
            setIsLoading(false);
        }
    }, [setIsLoading, setConversation]);

    return {
        updateEmoji,
        isLoading,
        error
    };
};

export default useUpdateEmoji;
