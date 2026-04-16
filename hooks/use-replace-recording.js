"use client";

import { useState } from "react";
import ApiService from "../services";
import useConversationStore from "../store/conversation.store";
import useGetTimeline from "./use-get-timeline";

const useReplaceRecording = () => {
    const setProcessing = useConversationStore((state) => state.setProcessing);
    const setSelectedRange = useConversationStore((state) => state.setSelectedRange);
    const { getTimeline } = useGetTimeline();
    const [error, setError] = useState(null);

    const replaceRecording = async (payload) => {
        setProcessing(true);
        setError(null);

        try {
            const response = await ApiService.replaceRecording(payload);
            const data = response?.data?.data || response?.data || response;

            // Rehydrate timeline strictly from backend payload source
            await getTimeline({ 
                conversationId: payload.conversationId, 
                workspaceId: payload.workspaceId 
            });

            // Resets UI selection layer cleanly
            setSelectedRange(null);

            setProcessing(false);
            return data;
        } catch (err) {
            // Guardrail sync if users try inserting over stale overlapping chunks handled by others elsewhere
            if (err?.response?.status === 409) {
                alert("State updated, retry your action.");
                await getTimeline({ 
                    conversationId: payload.conversationId, 
                    workspaceId: payload.workspaceId 
                });
            }
            setError(err);
            setProcessing(false);
            return null;
        }
    };

    return {
        replaceRecording,
        error
    };
};

export default useReplaceRecording;
