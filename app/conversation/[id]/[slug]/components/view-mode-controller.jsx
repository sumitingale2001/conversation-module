/**
 * ViewModeController Component
 * Responsible for initial data fetching and managing view mode transitions.
 */

'use client';

import { useEffect, useRef } from "react";
import useConversationStore from "../../../../../store/conversation.store";
import useGetConversation from "../../../../../hooks/use-get-conversation";
import { workspaceId } from "../../../../../utils/conversation.utils";

const ViewModeController = ({ slug, id }) => {
    const setViewMode = useConversationStore((state) => state.setViewMode);
    const conversation = useConversationStore((state) => state.conversation);
    const segments = useConversationStore((state) => state.segments);
    const { getConversation } = useGetConversation();
    
    const hasFetched = useRef(false);
    const hasTransitionedToSplit = useRef(false);

    // (a) Fetch conversation details from the backend on initial load.
    // (b) Dependencies: [] - Runs once on mount. hasFetched ref prevents double-fetching.
    useEffect(() => {
        if (id && !hasFetched.current) {
            hasFetched.current = true;
            // Read workspaceId from store or imported constant to avoid hardcoding.
            const targetWorkspaceId = useConversationStore.getState().conversation?.workspaceId || workspaceId;
            getConversation({ conversationId: id, workspaceId: targetWorkspaceId });
        }
    }, []);

    // (a) Sets initial viewMode based on slug.
    // (b) Dependencies: [slug, setViewMode] - Re-runs if slug changes.
    useEffect(() => {
        if (slug !== "instant") {
            hasTransitionedToSplit.current = true;
            setViewMode("split");
        }
    }, [slug, setViewMode]);

    // (a) Handles transitions from "left" to "split" based on status and content.
    // (b) Dependencies: [conversation?.status, segments?.length, setViewMode]
    useEffect(() => {
        if (!conversation?.status) return;

        const hasSegments = segments?.length > 0;

        if (
            conversation.status === "completed" ||
            conversation.status === "failed" ||
            hasSegments
        ) {
            hasTransitionedToSplit.current = true;
            setViewMode("split");
        } else if (conversation.status === "processing") {
            // Guard: Never revert to "left" if we've already transitioned to "split" once.
            if (hasTransitionedToSplit.current) return;
            setViewMode("left");
        }
    }, [conversation?.status, segments?.length, setViewMode]);

    return null;
};

export default ViewModeController;