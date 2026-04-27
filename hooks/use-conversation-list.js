"use client";

import { useCallback } from "react";
import apiInstance from "../config/apiInstance";
import useConversationListStore from "../store/conversation-list.store";

/**
 * Fetches and manages conversation listing data for a workspace.
 * Exposes list state, fetch action, and filter-change action.
 */
const useConversationList = (workspaceId) => {
  const {
    conversations,
    pagination,
    filter,
    isLoading,
    error,
    setConversations,
    setFilter,
    setLoading,
    setError,
  } = useConversationListStore();

  const fetchConversations = useCallback(
    async (overrideFilter) => {
      if (!workspaceId) return;

      setLoading(true);
      setError(null);

      try {
        const activeFilter = overrideFilter ?? filter;
        const { data } = await apiInstance.get(
          `/conversations/list?workspaceId=${workspaceId}&filter=${activeFilter}&page=1&limit=20`
        );

        if (!data?.success) throw new Error(data?.error || "Failed to fetch");
        setConversations(data?.data?.conversations, data?.data?.pagination);
      } catch (err) {
        console.error("[useConversationList] Fetch failed:", err);
        setError("Failed to load conversations. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [workspaceId, filter, setConversations, setLoading, setError]
  );

  const handleFilterChange = useCallback(
    (newFilter) => {
      setFilter(newFilter);
      fetchConversations(newFilter);
    },
    [setFilter, fetchConversations]
  );

  return {
    conversations,
    pagination,
    filter,
    isLoading,
    error,
    fetchConversations,
    handleFilterChange,
  };
};

export default useConversationList;
