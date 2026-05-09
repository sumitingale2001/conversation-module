/**
 * ViewModeController Component
 * Responsible for initial data fetching and managing view mode transitions.
 */

"use client";

import { useEffect, useRef } from "react";
import useConversationStore from "@/store/conversation.store";
import useGetConversation from "@/hooks/use-get-conversation";
import { workspaceId } from "@/utils/conversation.utils";

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
      getConversation({ conversationId: id, workspaceId });
    }
  }, [getConversation, id]);

  // Non-instant routes: default to split (summary + transcript).
  useEffect(() => {
    if (slug !== "instant") {
      hasTransitionedToSplit.current = true;
      setViewMode("split");
    }
  }, [slug, setViewMode]);

  // Instant recording: no saved segments → full-width transcript/record ("left");
  // after at least one segment exists (post-save) → "split".
  useEffect(() => {
    if (slug !== "instant") return;

    const hasSegments = (segments?.length ?? 0) > 0;
    if (hasSegments) {
      hasTransitionedToSplit.current = true;
      setViewMode("split");
    } else {
      setViewMode("left");
    }
  }, [slug, segments?.length, setViewMode]);

  // Non-instant only: status-driven left/split (unchanged for upload / other flows).
  useEffect(() => {
    if (slug === "instant") return;
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
      if (hasTransitionedToSplit.current) return;
      setViewMode("left");
    }
  }, [slug, conversation?.status, segments?.length, setViewMode]);

  return null;
};

export default ViewModeController;
