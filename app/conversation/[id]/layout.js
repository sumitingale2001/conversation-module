"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import useConversationStore from "../../../store/conversation.store";
import Header from "./components/header";

const Layout = ({ children }) => {
    const params = useParams();
    const setViewMode = useConversationStore((state) => state.setViewMode);
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (!hasInitialized.current) {
            const routeType = params?.type || params?.slug;
            if (routeType === "instant") {
                setViewMode("left");
            } else {
                setViewMode("split");
            }
            hasInitialized.current = true;
        }
    }, [params?.type, params?.slug, setViewMode]);

    return (
        <>
            <Header />
            {children}
        </>
    );
};

export default Layout;