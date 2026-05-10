import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useConversationStore from "@/store/conversation.store";
import { getPresets } from "../pageApi";

const PresetDropdown = ({
  children,
  onCreateCustomPage,
  onCreatePreset,
  onCreateSummaryPage,
  onCreateFromPreset,
  onOpenManagePresets,
}) => {
  const wrapperRef = useRef(null);
  const workspaceId = useConversationStore(
    (state) => state.conversation?.workspaceId,
  );
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const presetList = await getPresets({ workspaceId });
      setPresets(presetList);
    })();
  }, [open, workspaceId]);

  useEffect(() => {
    const onMouseDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, []);

  const menuButtonClass =
    "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100";

  return (
    <div className="relative" ref={wrapperRef}>
      <span onClick={() => setOpen((prev) => !prev)} role="presentation">
        {children}
      </span>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            className={menuButtonClass}
            onClick={() => {
              setOpen(false);
              onCreateCustomPage();
            }}
          >
            <Plus className="h-4 w-4 shrink-0 text-gray-900" strokeWidth={2} />
            New page
          </button>
          <button
            type="button"
            className={menuButtonClass}
            onClick={() => {
              setOpen(false);
              onCreatePreset();
            }}
          >
            <Plus className="h-4 w-4 shrink-0 text-gray-900" strokeWidth={2} />
            Create Preset
          </button>

          <div className="my-1 border-t border-gray-100" />

          <button
            type="button"
            className="w-full rounded px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100"
            onClick={() => {
              setOpen(false);
              onCreateSummaryPage();
            }}
          >
            Summary
          </button>

          {presets.map((preset) => (
            <button
              key={preset._id}
              type="button"
              onClick={() => {
                setOpen(false);
                onCreateFromPreset(preset);
              }}
              className="w-full truncate rounded px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100"
            >
              {preset.name}
            </button>
          ))}

          <button
            type="button"
            className="w-full rounded px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100"
            onClick={() => {
              setOpen(false);
              onOpenManagePresets();
            }}
          >
            Manage presets
          </button>
        </div>
      )}
    </div>
  );
};

export default PresetDropdown;
