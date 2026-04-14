import { useState } from "react";
import axios from "axios";

const useFetchConversation = () => {
    const [loading, setLoading] = useState(false);

    const getConversation = async ({ conversationId, workspaceId }) => {
        try {
            setLoading(true);

            const res = await axios.get("/api/conversation/get-by-id", {
                params: { conversationId, workspaceId },
            });

            return res.data;
        } catch (error) {
            console.error("Error fetching conversation:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return { getConversation, loading };
};

export default useFetchConversation;