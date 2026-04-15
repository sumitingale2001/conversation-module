'use client';

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Transcript from "./transcript";
import useGetConversation from "../../../../../hooks/use-get-conversation";

const ConversationContent = ({ slug }) => {
    const params = useParams();
    const { getConversation } = useGetConversation();

    useEffect(() => {
        if (params?.id) {
            getConversation({ 
                conversationId: params.id, 
                workspaceId: "681896a0b95b90b6f3996ed7" 
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params?.id]);

    return <div className="p-5" >
        <Transcript />
    </div>
}

export default ConversationContent;