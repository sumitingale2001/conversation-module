"use client";

import { Clock, Star } from "lucide-react";
import ConversationSkeleton from "./conversation-skeleton";
import ConversationCard from "./conversation-card";

/**
 * Conversation section with filter tabs and list content states.
 */
const tabClass = (isActive) =>
  isActive
    ? "border border-gray-300 bg-[#47BB17] text-white rounded-full px-4 py-1.5 text-sm font-medium flex items-center gap-1.5"
    : "rounded-full px-4 py-1.5 text-sm font-medium text-gray-400 flex items-center gap-1.5 hover:text-gray-600";

const ConverseSection = ({
  conversations,
  filter,
  isLoading,
  error,
  onFilterChange,
  onRetry,
  fetchConversations,
}) => {
  return (
    <section className="mt-8">
      <div className="flex items-center gap-2 mt-4">
        <button
          type="button"
          onClick={() => onFilterChange("recent")}
          className={`${tabClass(filter === "recent")} text-[11px]`}
        >
          <Clock className="h-4 w-4" />
          <span>Recent</span>
        </button>
        <button
          type="button"
          onClick={() => onFilterChange("starred")}
          className={`${tabClass(filter === "starred")} text-[11px]`}
        >
          <Star className="h-4 w-4" />
          <span>Starred</span>
        </button>
      </div>

      <div className="mt-4">
        {isLoading ? <ConversationSkeleton count={5} /> : null}

        {!isLoading && error ? (
          <div className="py-10 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => onRetry()}
              className="mt-3 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Retry
            </button>
          </div>
        ) : null}

        {!isLoading && !error && conversations.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">
            No conversations found.
          </div>
        ) : null}

        {!isLoading && !error && conversations.length > 0
          ? conversations.map((conversation) => (
              <ConversationCard
                key={conversation._id}
                conversation={conversation}
                fetchConversations={fetchConversations}
              />
            ))
          : null}
      </div>
    </section>
  );
};

export default ConverseSection;
