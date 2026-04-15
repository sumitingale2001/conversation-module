"use client";

import { useState } from "react";
import ApiService from "../services";
import useLoading from "./use-loading";
import useConversationStore from "../store/conversation.store";

const useToggleStar = () => {
    const { setLoading: setIsLoading, loading: isLoading } = useLoading();
    const [error, setError] = useState(null);

    const updateConversation = useConversationStore((state) => state.updateConversation);

    const toggleStar = async ({ conversationId, workspaceId }) => {
        const previousIsStarred = useConversationStore.getState().conversation?.isStarred;

        setIsLoading(true);
        setError(null);

        // Optimistic UI toggle immediately
        updateConversation({ isStarred: !previousIsStarred });

        try {
            const body = {
                conversationId,
                workspaceId,
            };

            const response = await ApiService.toggleConversationStar(body);

            // Sync definitively with actual backend success status preventing race/drift drift
            const actualState = response?.data?.isStarred ?? response?.isStarred;
            if (actualState !== undefined) {
                updateConversation({ isStarred: actualState });
            }

            setIsLoading(false);
        } catch (err) {
            // Revert fallback explicitly via caching the old block safely
            updateConversation({ isStarred: previousIsStarred });
            setError(err);
            setIsLoading(false);
        }
    };

    return {
        toggleStar,
        isLoading,
        error
    };
};

export default useToggleStar;
