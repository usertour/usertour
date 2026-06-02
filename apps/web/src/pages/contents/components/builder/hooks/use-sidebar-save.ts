import { useCallback } from 'react';
import { useBuilderConfig, useBuilderMethods } from '@/pages/contents/components/builder/core';

export interface UseSidebarSaveOptions {
  /** Return false to abort the save (e.g. Launcher's incomplete-action
   *  gate). Omit to always save. */
  canSave?: () => boolean;
}

// The Save-button handler every sidebar page shares: run the FSM save,
// then the host's `onSaved` (which navigates away). `saveContent` is
// idempotent (bails if not dirty) and awaits its mutations + the post-save
// fetchContentAndVersion, so once it resolves currentVersion === backupVersion
// and onSaved can leave cleanly. Pass `canSave` to gate the click
// (Launcher blocks on incomplete behavior actions).
export const useSidebarSave = (options?: UseSidebarSaveOptions) => {
  const { onSaved } = useBuilderConfig();
  const { saveContent } = useBuilderMethods();
  const canSave = options?.canSave;
  return useCallback(async () => {
    if (canSave && !canSave()) {
      return;
    }
    await saveContent();
    await onSaved?.();
  }, [canSave, saveContent, onSaved]);
};
