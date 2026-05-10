"use client";

import { GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  createPreset,
  getPresets,
  removePreset,
  updatePreset,
} from "../pageApi";
import PresetFormModal from "./PresetFormModal";
import { userId } from "@/utils/conversation.utils";

const ManagePresetModal = ({ open, workspaceId, onClose }) => {
  const [presets, setPresets] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  /** UI-only selection for checkboxes until a preset toggle API exists */
  const [presetChecked, setPresetChecked] = useState({});

  const loadPresets = useCallback(async () => {
    const list = await getPresets({ workspaceId });
    setPresets(list);
    setPresetChecked((prev) => {
      const next = { ...prev };
      for (const p of list) {
        if (next[p._id] === undefined) next[p._id] = true;
      }
      return next;
    });
  }, [workspaceId]);

  useEffect(() => {
    if (!open) return;
    loadPresets();
  }, [open, loadPresets]);

  const handleEditPreset = async (preset) => {
    const list = await getPresets({ workspaceId });
    const fresh = list.find((p) => p._id === preset._id) ?? preset;
    setEditingPreset(fresh);
  };

  const togglePresetChecked = (presetId) => {
    setPresetChecked((prev) => ({
      ...prev,
      [presetId]: !prev[presetId],
    }));
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
                className="h-3.5 w-3.5 shrink-0 text-gray-300"
                aria-hidden
              />
              <input
                type="checkbox"
                checked
                disabled
                className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 accent-[#1C1C92]"
                aria-label="Summary preset"
              />
              <span className="min-w-0 flex-1 truncate text-xs text-gray-700">
                Summary
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  disabled
                  className="rounded p-0.5 text-gray-300"
                  aria-label="Edit summary (locked)"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded p-0.5 text-gray-300"
                  aria-label="Delete summary (locked)"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {presets.map((preset) => (
              <div
                key={preset._id}
                className="flex items-center gap-1.5 border-b border-gray-100 px-2 py-1.5 last:border-b-0"
              >
                <GripVertical
                  className="h-3.5 w-3.5 shrink-0 cursor-grab text-gray-400 active:cursor-grabbing"
                  aria-hidden
                />
                <input
                  type="checkbox"
                  checked={presetChecked[preset._id] ?? true}
                  onChange={() => togglePresetChecked(preset._id)}
                  className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 accent-[#1C1C92]"
                  aria-label={`Select ${preset.name}`}
                />
                <span className="min-w-0 flex-1 truncate text-xs text-gray-700">
                  {preset.name}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleEditPreset(preset)}
                    className="rounded p-0.5 text-gray-500 hover:bg-gray-100"
                    aria-label={`Edit ${preset.name}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await removePreset({
                        workspaceId,
                        presetId: preset._id,
                      });
                      if (ok) loadPresets();
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
            userId,
          });
          setEditingPreset(null);
          loadPresets();
        }}
      />
    </>
  );
};

export default ManagePresetModal;
