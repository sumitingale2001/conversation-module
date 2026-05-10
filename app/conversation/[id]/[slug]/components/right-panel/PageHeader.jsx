import {
  Copy,
  FileText,
  Link2,
  MoreHorizontal,
  Settings2,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const PageHeader = ({
  page,
  onRename,
  onDelete,
  onLinkCanvas,
  onOpenManagePresets,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(page?.name || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local draft when page.name updates externally
    setNameDraft(page?.name || "");
  }, [page?.name]);

  const saveName = () => {
    const nextName = nameDraft.trim();
    setIsEditing(false);
    if (!nextName || nextName === page.name) return;
    onRename(nextName);
  };

  const isSummaryPage =
    page?.type === "summary" || page?._id === "local-summary";

  return (
    <div className="bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {isSummaryPage ? (
            <span
              className="shrink-0 select-none text-base leading-none text-gray-500"
              aria-hidden
            >
              ✦
            </span>
          ) : (
            <FileText
              className="h-4 w-4 shrink-0 text-gray-500"
              strokeWidth={2}
              aria-hidden
            />
          )}
          <div className="min-w-0 flex-1">
            {isSummaryPage ? (
              <span className="block max-w-full truncate text-left text-[12px] font-bold leading-[16px] text-[#666666]">
                {page.name}
              </span>
            ) : isEditing ? (
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
                className="w-full bg-transparent px-2 py-1 text-[12px] leading-[16px] text-gray-500 outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="max-w-full truncate text-left text-[12px] font-bold leading-[16px] text-[#666666]"
              >
                {page.name}
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {isSummaryPage && (
            <button
              type="button"
              className="cursor-pointer rounded-full px-3 py-1.5 text-[12px] font-medium leading-[16px] text-[#1C1C92]"
            >
              Generate
            </button>
          )}

          <button
            type="button"
            onClick={() => onLinkCanvas()}
            className="rounded-md p-1.5 text-[12px] leading-[16px] text-gray-500 hover:bg-gray-100"
            aria-label="Canvas"
          >
            <Copy className="h-4 w-4" strokeWidth={2} />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="rounded-md p-1.5 text-[#1A1A1A] hover:bg-gray-100"
              aria-label="Open page actions"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 z-20 mt-2 flex min-w-[220px] flex-col gap-2 rounded-xl bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onLinkCanvas();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg py-1 text-left text-[12px] leading-5 text-gray-600  outline-none hover:bg-gray-50 cursor-pointer"
                >
                  <Link2
                    className="h-4 w-4 shrink-0"
                    strokeWidth={2}
                    aria-hidden
                  />
                  Link to canvas
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg py-1 text-left text-[12px] leading-5 text-gray-600  outline-none hover:bg-gray-50 cursor-pointer"
                >
                  <Trash2
                    className="h-4 w-4 shrink-0"
                    strokeWidth={2}
                    aria-hidden
                  />
                  Move to Trash
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
