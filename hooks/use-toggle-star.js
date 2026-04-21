"use client";

import { useState, useCallback } from "react";
import ApiService from "../services";
import useLoading from "./use-loading";
import useConversationStore from "../store/conversation.store";

const useToggleStar = () => {
    const { setLoading: setIsLoading, loading: isLoading } = useLoading();
    const [error, setError] = useState(null);

    const setConversation = useConversationStore((state) => state.setConversation);

    const toggleStar = useCallback(async ({ conversationId, workspaceId }) => {
        const currentConversation = useConversationStore.getState().conversation;
        const previousIsStarred = currentConversation?.isStarred;

        setIsLoading(true);
        setError(null);

        // Optimistic UI toggle immediately
        setConversation({ ...currentConversation, isStarred: !previousIsStarred });

        try {
            const body = {
                conversationId,
                workspaceId,
            };

            const response = await ApiService.toggleConversationStar(body);

            // Sync definitively with actual backend success status preventing race/drift drift
            const actualState = response?.data?.isStarred ?? response?.isStarred;
            if (actualState !== undefined) {
                setConversation({ ...currentConversation, isStarred: actualState });
            }

            setIsLoading(false);
        } catch (err) {
            // Revert fallback explicitly via caching the old block safely
            setConversation({ ...currentConversation, isStarred: previousIsStarred });
            setError(err);
            setIsLoading(false);
        }
    }, [setIsLoading, setConversation]);

    return {
        toggleStar,
        isLoading,
        error
    };
};

export default useToggleStar;
