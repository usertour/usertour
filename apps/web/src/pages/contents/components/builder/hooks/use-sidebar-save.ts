import { useCallback } from 'react';
import { useBuilderConfig, useBuilderMethods } from '@/pages/contents/components/builder/core';

export interface UseSidebarSaveOptions {
  /** Return false to abort the save (e.g. Launcher's incomplete-action
   *  gate). Omit to always save. */
  canSave?: () => boolean;
}

// The Save-button handler every sidebar page shares: run the FSM save, then —
// only if it succeeded — the host's `onSaved` (which navigates away). A failed
// save keeps the user on the page (the error toast is already shown) rather
// than silently navigating away with unsaved edits. `saveContent` is idempotent
// (bails if not dirty) and re-baselines from its response, so on success
// currentVersion === backupVersion and onSaved can leave cleanly. Pass
// `canSave` to gate the click (Launcher blocks on incomplete behavior actions).
export const useSidebarSave = (options?: UseSidebarSaveOptions) => {
  const { onSaved } = useBuilderConfig();
  const { saveContent } = useBuilderMethods();
  const canSave = options?.canSave;
  return useCallback(async () => {
    if (canSave && !canSave()) {
      return;
    }
    if (await saveContent()) {
      await onSaved?.();
    }
  }, [canSave, saveContent, onSaved]);
};
