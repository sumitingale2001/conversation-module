"use client";

import { useState } from "react";
import ApiService from "../services";
import useLoading from "./use-loading";
import useConversationStore from "../store/conversation.store";

const useUpdateEmoji = () => {
    const { setLoading: setIsLoading, loading: isLoading } = useLoading();
    const [error, setError] = useState(null);

    const updateConversation = useConversationStore((state) => state.updateConversation);

    const updateEmoji = async (payload) => {
        // Fetch current emoji directly from store to guarantee no closure staleness during debounces
        const previousEmoji = useConversationStore.getState().conversation?.emoji;

        // High-Frequency Safety check: Prevent network overhead if emoji hasn't changed.
        // Extremely important for elements like Emoji Pickers that rapidly dispatch updates in short succession.
        if (payload.emoji === previousEmoji) return;

        setIsLoading(true);
        setError(null);

        try {
            // 1. Immediate optimistic UI sync
            updateConversation({ emoji: payload.emoji });

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
            updateConversation({ emoji: previousEmoji });
            
            setError(err);
            setIsLoading(false);
        }
    };

    return {
        updateEmoji,
        isLoading,
        error
    };
};

export default useUpdateEmoji;
