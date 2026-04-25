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
            const conversationData = response?.data;

            if (!conversationData?.conversation) {
                setError("Invalid response shape");
                setIsLoading(false);
                setStoreIsLoading(false);
                return null;
            }

            const { conversation, segments, tags, transcript } = conversationData;

            setTimeline({
                conversation: {
                    _id: conversation._id,
                    workspaceId: conversation.workspaceId,
                    sourceType: conversation.sourceType,
                    title: conversation.title,
                    emoji: conversation.emoji,
                    description: conversation.description,
                    totalDuration: conversation.totalDuration,
                    createdAt: conversation.createdAt,
                    isStarred: conversation.isStarred,
                    status: conversation.status,
                    formattedDuration: formatDuration(conversation.totalDuration),
                    formattedCreatedAt: formatCreatedAt(conversation.createdAt)
                },
                segments: segments || [],
                tags: tags || [],
                transcript: transcript || null
            });

            setIsLoading(false);
            setStoreIsLoading(false);
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
