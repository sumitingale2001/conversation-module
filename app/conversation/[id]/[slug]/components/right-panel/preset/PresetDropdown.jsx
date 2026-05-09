import { useEffect, useMemo, useRef, useState } from "react";
import useConversationStore from "@/store/conversation.store";
import { getPresets } from "../pageApi";

const PresetDropdown = ({
  children,
  onCreateCustomPage,
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

  const hasPresets = useMemo(() => presets.length > 0, [presets.length]);

  return (
    <div className="relative" ref={wrapperRef}>
      <span onClick={() => setOpen((prev) => !prev)} role="presentation">
        {children}
      </span>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCreateCustomPage();
            }}
            className="w-full rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            New Page
          </button>
          <div className="my-1 border-t border-gray-100" />
          {hasPresets ? (
            presets.map((preset) => (
              <button
                key={preset._id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onCreateFromPreset(preset);
                }}
                className="w-full truncate rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                {preset.name}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-gray-400">
              No custom presets yet
            </p>
          )}
          <div className="my-1 border-t border-gray-100" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenManagePresets();
            }}
            className="w-full rounded px-3 py-2 text-left text-sm font-medium text-indigo-600 hover:bg-indigo-50"
          >
            Manage Presets
          </button>
        </div>
      )}
    </div>
  );
};

export default PresetDropdown;
