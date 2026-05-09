import { Sparkles } from "lucide-react";

const EmptyState = ({ pageName = "Summary" }) => {
  return (
    <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center">
      <div className="mb-4 rounded-full bg-indigo-50 p-3 text-indigo-600">
        <Sparkles className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-gray-700">{pageName}</p>
      <p className="mt-1 max-w-md text-xs text-gray-500">
        Generate will create content for this page from transcript context.
      </p>
      <button
        type="button"
        disabled
        className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        Generate
      </button>
    </div>
  );
};

export default EmptyState;
