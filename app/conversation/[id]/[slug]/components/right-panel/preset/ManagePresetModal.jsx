import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createPreset,
  getPresets,
  removePreset,
  updatePreset,
} from "../pageApi";
import PresetFormModal from "./PresetFormModal";

const ManagePresetModal = ({ open, workspaceId, onClose }) => {
  const [presets, setPresets] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);

  const loadPresets = async () => {
    const list = await getPresets({ workspaceId });
    setPresets(list);
  };

  useEffect(() => {
    if (!open) return;
    loadPresets();
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Manage Preset</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-500 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-3 inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            <Plus className="h-4 w-4" />
            Custom Preset
          </button>

          <div className="mt-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-sm text-gray-700">
              <span>Summary</span>
              <span className="text-xs text-gray-400">Locked</span>
            </div>
            {presets.map((preset) => (
              <div
                key={preset._id}
                className="flex items-center justify-between border-b border-gray-100 px-3 py-2 last:border-b-0"
              >
                <span className="truncate text-sm text-gray-700">{preset.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingPreset(preset)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await removePreset({ workspaceId, presetId: preset._id });
                      loadPresets();
                    }}
                    className="rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
          await createPreset({ workspaceId, payload });
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
          await updatePreset({ workspaceId, presetId: editingPreset?._id, payload });
          setEditingPreset(null);
          loadPresets();
        }}
      />
    </>
  );
};

export default ManagePresetModal;
