"use client";

import { useState } from "react";
import ApiService from "../services";
import useConversationStore from "../store/conversation.store";

const useGetTimeline = () => {
    const setTimeline = useConversationStore((state) => state.setTimeline);
    const setIsLoading = useConversationStore((state) => state.setIsLoading);
    const [error, setError] = useState(null);

    const getTimeline = async ({ conversationId, workspaceId }) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await ApiService.getTimeline(conversationId, workspaceId);
            const data = response?.data?.data || response?.data || response;

            if (data) {
                setTimeline(data);
            }

            setIsLoading(false);
            return data;
        } catch (err) {
            setError(err);
            setIsLoading(false);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        getTimeline,
        error
    };
};

export default useGetTimeline;
