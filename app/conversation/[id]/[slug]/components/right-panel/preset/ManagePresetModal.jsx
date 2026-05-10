"use client";

import { GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  createPreset,
  getPresets,
  removePreset,
  reorderPresets,
  updatePreset,
} from "../pageApi";
import PresetFormModal from "./PresetFormModal";
import { userId } from "@/utils/conversation.utils";
import {
  EMPTY_HIDDEN_PRESET_IDS,
  SUMMARY_MENU_ITEM_ID,
  usePresetDropdownVisibilityStore,
} from "@/store/presetDropdownVisibility.store";

const isSummaryPreset = (p) =>
  p?.type === "summary" ||
  (typeof p?.name === "string" && p.name.trim().toLowerCase() === "summary");

const ManagePresetModal = ({ open, workspaceId, onClose }) => {
  const [presets, setPresets] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [dragId, setDragId] = useState(null);

  const hiddenPresetIds = usePresetDropdownVisibilityStore((s) => {
    if (!workspaceId) return EMPTY_HIDDEN_PRESET_IDS;
    return (
      s.hiddenPresetIdsByWorkspace[String(workspaceId)] ??
      EMPTY_HIDDEN_PRESET_IDS
    );
  });
  const togglePresetHidden = usePresetDropdownVisibilityStore(
    (s) => s.toggleHidden,
  );
  const setPresetHidden = usePresetDropdownVisibilityStore((s) => s.setHidden);
  const removePresetEntry = usePresetDropdownVisibilityStore(
    (s) => s.removePresetEntry,
  );

  const loadPresets = useCallback(async () => {
    const list = await getPresets({ workspaceId });
    setPresets(list);
    return list;
  }, [workspaceId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void getPresets({ workspaceId }).then((list) => {
      if (!cancelled) setPresets(list);
    });
    return () => {
      cancelled = true;
    };
  }, [open, workspaceId]);

  const handleEditPreset = async (preset) => {
    const list = await getPresets({ workspaceId });
    const fresh = list.find((p) => p._id === preset._id) ?? preset;
    setEditingPreset(fresh);
    
  };

  const summaryPreset = presets.find(isSummaryPreset);
  const otherPresets = presets.filter((p) => !isSummaryPreset(p));

  const onDropOn = useCallback(
    async (targetId) => {
      if (dragId == null || dragId === targetId) {
        setDragId(null);
        return;
      }
      const ids = otherPresets.map((p) => String(p._id));
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(targetId);
      if (from < 0 || to < 0) {
        setDragId(null);
        return;
      }
      const next = [...ids];
      next.splice(from, 1);
      next.splice(to, 0, dragId);
      setDragId(null);

      const updated = await reorderPresets({ workspaceId, presetIds: next });
      if (Array.isArray(updated)) {
        setPresets(updated);
      } else {
        await loadPresets();
      }
    },
    [dragId, otherPresets, workspaceId, loadPresets],
  );

  const handleEditSummary = async () => {
    const list = await getPresets({ workspaceId });
    const fresh = list.find(isSummaryPreset) ?? summaryPreset;
    if (fresh) setEditingPreset(fresh);
  };

  const handleDeleteSummary = async () => {
    if (!summaryPreset?._id) {
      setPresetHidden(workspaceId, SUMMARY_MENU_ITEM_ID, true);
      return;
    }
    const ok = await removePreset({
      workspaceId,
      presetId: summaryPreset._id,
    });
    if (ok) {
      removePresetEntry(workspaceId, summaryPreset._id);
      removePresetEntry(workspaceId, SUMMARY_MENU_ITEM_ID);
      loadPresets();
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex justify-center bg-black/20 px-4 pb-4 pt-[60px]"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="flex h-[266px] w-[248px] flex-col gap-[10px] rounded-[8px] bg-white p-[10px] shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-labelledby="manage-preset-title"
        >
          <div className="flex shrink-0 items-center justify-between gap-2">
            <h3
              id="manage-preset-title"
              className="truncate text-sm font-semibold text-gray-800"
            >
              Manage Preset
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded p-0.5 text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex shrink-0 items-center justify-center gap-1 rounded-md border border-gray-200 px-2 py-1.5 text-xs font-medium text-[#1C1C92] hover:bg-gray-50"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Custom Preset
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-200">
            <div className="flex items-center gap-1.5 border-b border-gray-100 px-2 py-1.5">
              <GripVertical
                className="h-3.5 w-3.5 shrink-0 cursor-grab text-gray-400 active:cursor-grabbing"
                aria-hidden
              />
              <input
                type="checkbox"
                checked={
                  !hiddenPresetIds.includes(String(SUMMARY_MENU_ITEM_ID))
                }
                onChange={() =>
                  togglePresetHidden(workspaceId, SUMMARY_MENU_ITEM_ID)
                }
                className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 accent-[#1C1C92]"
                aria-label="Show Summary in new page menu"
              />
              <span className="min-w-0 flex-1 truncate text-xs text-gray-700">
                Summary
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => void handleEditSummary()}
                  className="rounded p-0.5 text-gray-500 hover:bg-gray-100"
                  aria-label="Edit Summary preset"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteSummary()}
                  className="rounded p-0.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete Summary preset"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {otherPresets.map((preset) => (
              <div
                key={preset._id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  setDragId(String(preset._id));
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={() => void onDropOn(String(preset._id))}
                onDragEnd={() => setDragId(null)}
                className="flex items-center gap-1.5 border-b border-gray-100 px-2 py-1.5 last:border-b-0"
              >
                <GripVertical
                  className="h-3.5 w-3.5 shrink-0 cursor-grab text-gray-400 active:cursor-grabbing"
                  aria-hidden
                />
                <input
                  type="checkbox"
                  draggable={false}
                  checked={!hiddenPresetIds.includes(String(preset._id))}
                  onChange={() => togglePresetHidden(workspaceId, preset._id)}
                  className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 accent-[#1C1C92]"
                  aria-label={`Show ${preset.name} in new page menu`}
                />
                <span className="min-w-0 flex-1 truncate text-xs text-gray-700">
                  {preset.name}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    draggable={false}
                    onClick={() => handleEditPreset(preset)}
                    className="rounded p-0.5 text-gray-500 hover:bg-gray-100"
                    aria-label={`Edit ${preset.name}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    draggable={false}
                    onClick={async () => {
                      const ok = await removePreset({
                        workspaceId,
                        presetId: preset._id,
                      });
                      if (ok) {
                        removePresetEntry(workspaceId, preset._id);
                        loadPresets();
                      }
                    }}
                    className="rounded p-0.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${preset.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PresetFormModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmit={async (payload) => {
          await createPreset({ workspaceId, payload, userId });
          setCreateOpen(false);
          loadPresets();
        }}
      />

      <PresetFormModal
        open={Boolean(editingPreset)}
        mode="edit"
        initialPreset={editingPreset}
        onClose={() => setEditingPreset(null)}
        onSubmit={async (payload) => {
          if (!editingPreset?._id) return;
          await updatePreset({
            workspaceId,
            presetId: editingPreset._id,
            payload,
          });
          setEditingPreset(null);
          loadPresets();
        }}
      />
    </>
  );
};

export default ManagePresetModal;
