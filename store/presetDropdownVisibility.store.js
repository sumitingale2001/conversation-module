import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Stable fallback for selectors (avoid `?? []` → new ref each snapshot / infinite loop). */
export const EMPTY_HIDDEN_PRESET_IDS = Object.freeze([]);

/** Sentinel id: toggles “Summary” row in the + menu (not an API preset _id). */
export const SUMMARY_MENU_ITEM_ID = "__spectrum_summary_menu__";

/**
 * Presets unchecked in Manage Preset are hidden from the + dropdown until checked again.
 * Keyed by workspace so different workspaces stay isolated.
 */
export const usePresetDropdownVisibilityStore = create(
  persist(
    (set, get) => ({
      /** workspaceId -> preset ids hidden from the + menu */
      hiddenPresetIdsByWorkspace: {},

      isHidden: (workspaceId, presetId) => {
        if (!workspaceId || presetId == null) return false;
        const wid = String(workspaceId);
        const pid = String(presetId);
        const ids =
          get().hiddenPresetIdsByWorkspace[wid] ?? EMPTY_HIDDEN_PRESET_IDS;
        return ids.includes(pid);
      },

      setHidden: (workspaceId, presetId, hidden) => {
        if (!workspaceId || presetId == null) return;
        const wid = String(workspaceId);
        const pid = String(presetId);
        set((state) => {
          const prev =
            state.hiddenPresetIdsByWorkspace[wid] ?? EMPTY_HIDDEN_PRESET_IDS;
          let next;
          if (hidden) {
            next = prev.includes(pid) ? prev : [...prev, pid];
          } else {
            next = prev.filter((id) => id !== pid);
          }
          return {
            hiddenPresetIdsByWorkspace: {
              ...state.hiddenPresetIdsByWorkspace,
              [wid]: next,
            },
          };
        });
      },

      toggleHidden: (workspaceId, presetId) => {
        const hidden = get().isHidden(workspaceId, presetId);
        get().setHidden(workspaceId, presetId, !hidden);
      },

      /** Call when a preset is deleted so stale ids are not kept */
      removePresetEntry: (workspaceId, presetId) => {
        if (!workspaceId || presetId == null) return;
        const wid = String(workspaceId);
        const pid = String(presetId);
        set((state) => {
          const prev =
            state.hiddenPresetIdsByWorkspace[wid] ?? EMPTY_HIDDEN_PRESET_IDS;
          const next = prev.filter((id) => id !== pid);
          const copy = { ...state.hiddenPresetIdsByWorkspace };
          if (next.length === 0) delete copy[wid];
          else copy[wid] = next;
          return { hiddenPresetIdsByWorkspace: copy };
        });
      },
    }),
    {
      name: "preset-dropdown-visibility",
      partialize: (state) => ({
        hiddenPresetIdsByWorkspace: state.hiddenPresetIdsByWorkspace,
      }),
    },
  ),
);
