"use client";

import { useState } from "react";
import ApiService from "../services";
import useLoading from "./use-loading";
import useConversationStore from "../store/conversation.store";
import { formatDuration, formatCreatedAt } from "../utils/conversation.utils";

const useGetConversation = () => {
    const { setLoading: setIsLoading, loading: isLoading } = useLoading();
    const [error, setError] = useState(null);

    const { setConversation, setTimeline, setIsLoading: setStoreIsLoading } = useConversationStore();

    const getConversation = async ({ conversationId, workspaceId }) => {
        setIsLoading(true);
        setStoreIsLoading(true);
        setError(null);

        try {
            const response = await ApiService.getConversation(conversationId, workspaceId);

          
            const conversationData = response?.data?.data || response?.data || response;

            if (conversationData) {
                // Use setTimeline to ensure segments and tags are also processed/mapped
                setTimeline({
                    conversation: {
                        _id: conversationData.conversation._id,
                        title: conversationData.conversation.title,
                        emoji: conversationData.conversation.emoji,
                        description: conversationData.conversation.description,
                        totalDuration: conversationData.conversation.totalDuration,
                        createdAt: conversationData.conversation.createdAt,
                        isStarred: conversationData.conversation.isStarred,
                        status: conversationData.conversation.status, // Ensure status is synced
                        formattedDuration: formatDuration(conversationData.conversation.totalDuration),
                        formattedCreatedAt: formatCreatedAt(conversationData.conversation.createdAt)
                    },
                    segments: conversationData.segments || [],
                    tags: conversationData.tags || []
                });
            }
            

            setIsLoading(false);
            setStoreIsLoading(false);
            // return conversationData;
        } catch (err) {
            setError(err);
            setIsLoading(false);
            setStoreIsLoading(false);
            return null;
        } finally {
            setIsLoading(false);
            setStoreIsLoading(false);
        }
    };

    return {
        getConversation,
        isLoading,
        error
    };
};

export default useGetConversation;
