import { useEffect, useMemo, useState } from "react";

const PresetFormModal = ({
  open,
  mode = "create",
  initialPreset = null,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initialPreset?.name || "");
    setInstructions(initialPreset?.instructions || "");
  }, [open, initialPreset]);

  const hasChanges = useMemo(() => {
    if (mode === "create") return true;
    return (
      name.trim() !== (initialPreset?.name || "").trim() ||
      instructions.trim() !== (initialPreset?.instructions || "").trim()
    );
  }, [mode, name, instructions, initialPreset]);

  if (!open) return null;

  const isDisabled = !name.trim() || !instructions.trim() || !hasChanges;
  const title = mode === "create" ? "Create Preset" : "Edit Preset";
  const actionLabel = mode === "create" ? "Create" : "Save";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-4 shadow-xl">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Ex. Research papers"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none ring-indigo-300 focus:ring-1"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              maxLength={4000}
              placeholder="Add your generation instructions..."
              className="h-48 w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm outline-none ring-indigo-300 focus:ring-1"
            />
            <div className="mt-1 text-right text-[11px] text-gray-400">
              {instructions.length}/4000
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => onSubmit({ name: name.trim(), instructions: instructions.trim() })}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PresetFormModal;
