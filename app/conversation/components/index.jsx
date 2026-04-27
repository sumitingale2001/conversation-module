"use client";

import { useEffect, useMemo } from "react";
import Header from "./header";
import SearchAndCreate from "./search-and-create";
import ConverseSection from "./converse-section";
import useConversationList from "../../../hooks/use-conversation-list";
import { workspaceId as fallbackWorkspaceId } from "../../../utils/conversation.utils";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const getAuthUser = () => {
  if (typeof window === "undefined") return null;
  try {
    const userAuth = localStorage.getItem("persist:auth");
    if (!userAuth) return null;

    const parsedAuth = JSON.parse(userAuth);
    return parsedAuth?.user ? JSON.parse(parsedAuth.user) : null;
  } catch (error) {
    return null;
  }
};

const Greetings = ({ name }) => (
  <div className="flex flex-col gap-1 font-bold text-[28px] leading-[34px]">
    <span className="text-[#666666]">{getGreeting()},</span>
    <span className="text-[#47BB17]">{name || "User"}!</span>
  </div>
);

const ConversationList = () => {
  const authUser = useMemo(() => getAuthUser(), []);
  const workspaceId =
    authUser?.currentWorkSpace || authUser?.workspaceId || fallbackWorkspaceId;
  const userName =
    authUser?.firstName || authUser?.userName || authUser?.profileUsername || "User";

  const {
    conversations,
    filter,
    isLoading,
    error,
    fetchConversations,
    handleFilterChange,
  } = useConversationList(workspaceId);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return (
    <>
      <Header />
      <div className="max-w-[1215px] w-full mx-auto gap-10 p-5">
        <Greetings name={userName} />
        <SearchAndCreate />
        <ConverseSection
          conversations={conversations}
          filter={filter}
          isLoading={isLoading}
          error={error}
          onFilterChange={handleFilterChange}
          onRetry={fetchConversations}
          fetchConversations={fetchConversations}
        />
      </div>
    </>
  );
};

export default ConversationList;