"use client";

import { Open_Sans } from "next/font/google";
import { useEffect, useMemo, useState } from "react";

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const NAME_MAX = 60;
const INSTRUCTIONS_MAX = 2500;

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
    /* eslint-disable react-hooks/set-state-in-effect -- reset form when modal opens or preset changes */
    setName(initialPreset?.name || "");
    setInstructions(initialPreset?.instructions || "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initialPreset]);

  const hasChanges = useMemo(() => {
    if (mode === "create") return true;
    return (
      name.trim() !== (initialPreset?.name || "").trim() ||
      instructions.trim() !== (initialPreset?.instructions || "").trim()
    );
  }, [mode, name, instructions, initialPreset]);

  if (!open) return null;

  const isFilled = Boolean(name.trim() && instructions.trim());
  const isDisabled =
    mode === "create"
      ? !isFilled
      : !isFilled || !hasChanges;

  const title = mode === "create" ? "Create Preset" : "Edit Preset";
  const actionLabel = mode === "create" ? "Create" : "Save";

  const labelClass =
    "block text-[14px] font-bold leading-[20px] text-gray-900";

  const fieldClass =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-shadow focus:border-gray-300";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-black/30 px-4 pb-4 pt-[60px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`${openSans.className} flex h-[527px] w-[540px] max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] flex-col gap-5 rounded-[12px] bg-white p-[15px] shadow-xl`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="preset-form-title"
      >
        <h2
          id="preset-form-title"
          className={`${labelClass} shrink-0`}
        >
          {title}
        </h2>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <label htmlFor="preset-name" className={labelClass}>
              Name
            </label>
            <input
              id="preset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              placeholder="Ex. Research papers"
              className={`${fieldClass} placeholder:text-gray-400`}
            />
            <p className="text-right text-[12px] leading-4 text-gray-400">
              {name.length}/{NAME_MAX}
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <label htmlFor="preset-instructions" className={labelClass}>
              Instructions
            </label>
            <p className="text-[12px] leading-4 text-gray-400">
              Lorem ipsum dolor sit amet consectetur.
            </p>
            <textarea
              id="preset-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              maxLength={INSTRUCTIONS_MAX}
              placeholder=""
              className={`${fieldClass} min-h-[200px] flex-1 resize-none`}
            />
            <p className="text-right text-[12px] leading-4 text-gray-400">
              {instructions.length}/{INSTRUCTIONS_MAX}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 justify-end">
          <button
            type="button"
            disabled={isDisabled}
            onClick={() =>
              onSubmit({ name: name.trim(), instructions: instructions.trim() })
            }
            className="rounded-lg px-5 py-2.5 text-[14px] font-bold leading-[20px] text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 enabled:bg-[#1C1C92] enabled:text-white enabled:hover:opacity-95"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PresetFormModal;
