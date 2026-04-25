'use client';

import { useEffect, useRef } from "react";
import useConversationStore from "../../../../../store/conversation.store";
import useGetConversation from "../../../../../hooks/use-get-conversation";

const ViewModeController = ({ slug, id }) => {
    const setViewMode = useConversationStore((state) => state.setViewMode);
    const conversation = useConversationStore((state) => state.conversation);
    const segments = useConversationStore((state) => state.segments);
    const { getConversation } = useGetConversation();
    const hasFetched = useRef(false);

    // Fetch conversation ONCE on mount
    useEffect(() => {
        if (id && !hasFetched.current) {
            hasFetched.current = true;
            getConversation({ conversationId: id, workspaceId: "681896a0b95b90b6f3996ed7" });
        }
    }, []);

    // Set initial viewMode based on slug — only for non-instant slugs
    useEffect(() => {
        if (slug !== "instant") {
            setViewMode("split");
        }
    }, [slug, setViewMode]);

    // Transition viewMode driven by conversation status AND segments presence
    useEffect(() => {
        if (!conversation?.status) return;

        const hasSegments = segments?.length > 0;

        if (
            conversation.status === "completed" ||
            conversation.status === "failed" ||
            hasSegments
        ) {
            setViewMode("split");
        } else if (conversation.status === "processing") {
            setViewMode("left");
        }
    }, [conversation?.status, segments?.length, setViewMode]);

    return null;
};

export default ViewModeController;