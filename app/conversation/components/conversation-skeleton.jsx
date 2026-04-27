/**
 * Conversation list skeleton components.
 * Mirrors conversation card layout while list data is loading.
 */
const ConversationSkeletonCard = () => (
  <div className="py-4 animate-pulse">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 flex-1">
        <div className="h-5 w-5 rounded bg-gray-200 shrink-0" />
        <div className="h-4 w-64 rounded bg-gray-200" />
      </div>
      <div className="flex gap-2">
        <div className="h-4 w-4 rounded bg-gray-200" />
        <div className="h-4 w-4 rounded bg-gray-200" />
      </div>
    </div>
    <div className="ml-7 mt-2 space-y-1.5">
      <div className="h-3 w-full rounded bg-gray-100" />
      <div className="h-3 w-3/4 rounded bg-gray-100" />
    </div>
    <div className="ml-7 mt-2 flex items-center gap-4">
      <div className="h-3 w-16 rounded bg-gray-100" />
      <div className="h-3 w-12 rounded bg-gray-100" />
      <div className="h-3 w-14 rounded bg-gray-100" />
      <div className="h-3 w-20 rounded bg-gray-100" />
      <div className="h-3 w-24 rounded bg-gray-100" />
    </div>
  </div>
);

const ConversationSkeleton = ({ count = 5 }) => (
  <div>
    {Array.from({ length: count }).map((_, i) => (
      <div key={`conversation-skeleton-${i}`}>
        <ConversationSkeletonCard />
        {i < count - 1 && <div className="border-b border-gray-100" />}
      </div>
    ))}
  </div>
);

export default ConversationSkeleton;
