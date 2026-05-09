import { Copy, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const PageHeader = ({
  page,
  onRename,
  editorText,
  onDelete,
  onLinkCanvas,
  onOpenManagePresets,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(page?.name || "");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setNameDraft(page?.name || "");
  }, [page?.name]);

  const wordCount = useMemo(() => {
    const text = (editorText || "").trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  }, [editorText]);

  const saveName = () => {
    const nextName = nameDraft.trim();
    setIsEditing(false);
    if (!nextName || nextName === page.name) return;
    onRename(nextName);
  };

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") {
                  setNameDraft(page.name);
                  setIsEditing(false);
                }
              }}
              maxLength={100}
              className="w-full rounded border border-gray-200 px-2 py-1 text-base font-semibold text-gray-800 outline-none ring-indigo-400 focus:ring-1"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="max-w-full truncate text-left text-base font-semibold text-gray-900"
            >
              {page.name}
            </button>
          )}
          <div className="mt-1 text-xs text-gray-500">
            Edited {new Date(page.updatedAt || page.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-gray-200 px-2 py-1 text-xs text-gray-500">
            {wordCount} words
          </span>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(editorText || "")}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Copy text"
          >
            <Copy className="h-4 w-4" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label="Open page actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLinkCanvas();
                  }}
                  className="w-full rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Link to canvas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenManagePresets();
                  }}
                  className="w-full rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Manage presets
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Delete page
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
