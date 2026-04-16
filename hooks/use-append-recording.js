"use client";

import { useState } from "react";
import ApiService from "../services";
import useConversationStore from "../store/conversation.store";
import useGetTimeline from "./use-get-timeline";

const useAppendRecording = () => {
    const setProcessing = useConversationStore((state) => state.setProcessing);
    const { getTimeline } = useGetTimeline();
    const [error, setError] = useState(null);

    const appendRecording = async (payload) => {
        setProcessing(true);
        setError(null);

        try {
            const response = await ApiService.appendRecording(payload);
            const data = response?.data?.data || response?.data || response;

            // On success, forcefully refetch the latest merged timeline strictly via backend.
            await getTimeline({ 
                conversationId: payload.conversationId, 
                workspaceId: payload.workspaceId 
            });

            setProcessing(false);
            return data;
        } catch (err) {
            // Immediately sync state back if 409 detects we mismatched our boundaries locally vs server
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
        appendRecording,
        error
    };
};

export default useAppendRecording;
