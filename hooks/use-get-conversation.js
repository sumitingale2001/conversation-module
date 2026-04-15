"use client";

import { useState } from "react";
import ApiService from "../services";
import useLoading from "./use-loading";
import useConversationStore from "../store/conversation.store";
import { formatDuration, formatCreatedAt } from "../utils/conversation.utils";

const useGetConversation = () => {
    const { setLoading: setIsLoading, loading: isLoading } = useLoading();
    const [error, setError] = useState(null);

    const { setConversation, setIsLoading: setStoreIsLoading } = useConversationStore();

    const getConversation = async ({ conversationId, workspaceId }) => {
        setIsLoading(true);
        setStoreIsLoading(true);
        setError(null);

        try {
            const response = await ApiService.getConversation(conversationId, workspaceId);

            // Destructure/safeguard depending on whether data is wrapped deeply (e.g. response.data.data) 
            // or just returned natively at the top level (response.data)
            const conversationData = response?.data?.data || response?.data || response;

            if (conversationData) {
                setConversation({
                    _id: conversationData._id,
                    title: conversationData.title,
                    emoji: conversationData.emoji,
                    description: conversationData.description,
                    totalDuration: conversationData.totalDuration,
                    createdAt: conversationData.createdAt,
                    isStarred: conversationData.isStarred,
                    formattedDuration: formatDuration(conversationData.totalDuration),
                    formattedCreatedAt: formatCreatedAt(conversationData.createdAt)
                });
            }

            setIsLoading(false);
            setStoreIsLoading(false);
            return conversationData;
        } catch (err) {
            setError(err);
            setIsLoading(false);
            setStoreIsLoading(false);
            return null;
        }
    };

    return {
        getConversation,
        isLoading,
        error
    };
};

export default useGetConversation;
