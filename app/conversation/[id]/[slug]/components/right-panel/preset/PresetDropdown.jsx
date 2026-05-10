"use client";

import { Plus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import useConversationStore from "@/store/conversation.store";
import {
  EMPTY_HIDDEN_PRESET_IDS,
  SUMMARY_MENU_ITEM_ID,
  usePresetDropdownVisibilityStore,
} from "@/store/presetDropdownVisibility.store";
import { getPresets } from "../pageApi";

const MENU_WIDTH_PX = 224;

const PresetDropdown = ({
  children,
  onCreateCustomPage,
  onCreatePreset,
  onCreateSummaryPage,
  onCreateFromPreset,
  onOpenManagePresets,
}) => {
  const wrapperRef = useRef(null);
  const menuRef = useRef(null);
  const workspaceId = useConversationStore(
    (state) => state.conversation?.workspaceId,
  );
  const hiddenPresetIds = usePresetDropdownVisibilityStore((s) => {
    if (!workspaceId) return EMPTY_HIDDEN_PRESET_IDS;
    return (
      s.hiddenPresetIdsByWorkspace[String(workspaceId)] ??
      EMPTY_HIDDEN_PRESET_IDS
    );
  });
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState([]);
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0 });

  const visiblePresets = useMemo(
    () =>
      presets.filter((p) => !hiddenPresetIds.includes(String(p._id))),
    [presets, hiddenPresetIds],
  );

  const updateMenuPosition = useCallback(() => {
    const el = wrapperRef.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let left = rect.right - MENU_WIDTH_PX;
    left = Math.min(left, window.innerWidth - MENU_WIDTH_PX - pad);
    left = Math.max(pad, left);
    setMenuCoords({
      top: rect.bottom + 8,
      left,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const presetList = await getPresets({ workspaceId });
      setPresets(presetList);
    })();
  }, [open, workspaceId]);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => updateMenuPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    const onMouseDown = (event) => {
      const t = event.target;
      if (
        wrapperRef.current?.contains(t) ||
        menuRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, []);

  const menuButtonClass =
    "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100";

  const menuContent = open && (
    <div
      ref={menuRef}
      className="fixed z-[9999] max-h-[min(266px,calc(100vh-24px))] w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
      style={{
        top: menuCoords.top,
        left: menuCoords.left,
      }}
    >
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

      {!hiddenPresetIds.includes(String(SUMMARY_MENU_ITEM_ID)) && (
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
      )}

      {visiblePresets.map((preset) => (
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
  );

  return (
    <>
      <div className="relative shrink-0" ref={wrapperRef}>
        <span onClick={() => setOpen((prev) => !prev)} role="presentation">
          {children}
        </span>
      </div>
      {typeof document !== "undefined" &&
        menuContent &&
        createPortal(menuContent, document.body)}
    </>
  );
};

export default PresetDropdown;
