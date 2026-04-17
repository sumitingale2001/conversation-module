'use client';

import { useEffect, useRef } from "react";
import useConversationStore from "../../../../../store/conversation.store";
import useGetConversation from "../../../../../hooks/use-get-conversation";

const ViewModeController = ({ slug , id}) => {
    const setViewMode = useConversationStore((state) => state.setViewMode);
    const hasInitialized = useRef(false);

       const {getConversation} = useGetConversation()

    useEffect(() => {
            getConversation({conversationId: id, workspaceId: "681896a0b95b90b6f3996ed7"})
    }, [slug])

    useEffect(() => {
        if (!hasInitialized.current) {
            setViewMode(slug === "instant" ? "left" : "split");
            hasInitialized.current = true;
        }
    }, [slug, setViewMode]);

    return null;
};

export default ViewModeController;
