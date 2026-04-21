"use client";

import { useState, useCallback } from "react";
import ApiService from "../services";
import useLoading from "./use-loading";
import useConversationStore from "../store/conversation.store";

const useRenameConversation = () => {
    const { setLoading: setIsLoading, loading: isLoading } = useLoading();
    const [error, setError] = useState(null);

    const setConversation = useConversationStore((state) => state.setConversation);

    const renameConversation = useCallback(async (payload) => {
        setIsLoading(true);
        setError(null);

        // Fetch current title directly from store to avoid React closure staleness
        const currentConversation = useConversationStore.getState().conversation;
        const previousTitle = currentConversation?.title;

        try {
            // 1. Optimistic Update
            setConversation({ ...currentConversation, title: payload.title });

            const body = {
                conversationId: payload.conversationId,
                workspaceId: payload.workspaceId,
                title: payload.title,
            };

            // 2. API Call
            await ApiService.updateConversationTitle(body);

            setIsLoading(false);
        } catch (err) {
            // 3. Rollback on failure
            setConversation({ ...currentConversation, title: previousTitle });
            
            setError(err);
            setIsLoading(false);
        }
    }, [setIsLoading, setConversation]);

    return {
        renameConversation,
        isLoading,
        error
    };
};

export default useRenameConversation;
