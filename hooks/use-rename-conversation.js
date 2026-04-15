"use client";

import { useState } from "react";
import ApiService from "../services";
import useLoading from "./use-loading";
import useConversationStore from "../store/conversation.store";

const useRenameConversation = () => {
    const { setLoading: setIsLoading, loading: isLoading } = useLoading();
    const [error, setError] = useState(null);

    const updateConversation = useConversationStore((state) => state.updateConversation);

    const renameConversation = async (payload) => {
        setIsLoading(true);
        setError(null);

        // Fetch current title directly from store to avoid React closure staleness
        const previousTitle = useConversationStore.getState().conversation?.title;

        try {
            // 1. Optimistic Update
            updateConversation({ title: payload.title });

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
            updateConversation({ title: previousTitle });
            
            setError(err);
            setIsLoading(false);
        }
    };

    return {
        renameConversation,
        isLoading,
        error
    };
};

export default useRenameConversation;
