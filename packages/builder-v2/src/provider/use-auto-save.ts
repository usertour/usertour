import { isEqual } from '@usertour/helpers';
import type { ContentVersion } from '@usertour/types';
import { useCallback, useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import type { BuilderProviderMethods } from './types';
import type { BuilderStore } from '../store/builder-store';

export interface UseAutoSaveArgs {
  store: BuilderStore;
  saveContent: BuilderProviderMethods['saveContent'];
}

export interface UseAutoSaveReturn {
  setAutoSaveValidator: BuilderProviderMethods['setAutoSaveValidator'];
}

// Auto-save driver. Subscribes to currentVersion + backupVersion diff.
// On dirty → transitions saveState to 'dirty' and triggers a save
// (race-safe via the per-save identity check inside saveContent).
//
// Per-type editors can register an `autoSaveValidator` predicate that
// runs before each auto-save cycle. A veto keeps saveState = 'dirty'
// but skips THIS auto-save invocation; explicit Save (saveContent
// called from a button) bypasses the validator entirely. Used by
// Launcher to avoid persisting incomplete action chips while the user
// is mid-edit.
export const useAutoSave = (args: UseAutoSaveArgs): UseAutoSaveReturn => {
  const { store, saveContent } = args;

  const autoSaveValidatorRef = useRef<((version: ContentVersion) => boolean) | null>(null);
  const setAutoSaveValidator = useCallback<BuilderProviderMethods['setAutoSaveValidator']>((fn) => {
    autoSaveValidatorRef.current = fn;
  }, []);

  const currentVersion = useStore(store, (s) => s.currentVersion);
  const backupVersion = useStore(store, (s) => s.backupVersion);
  useEffect(() => {
    if (!currentVersion || !backupVersion) {
      return;
    }
    if (!isEqual(currentVersion, backupVersion)) {
      store
        .getState()
        .transitionSaveState((prev) =>
          prev.status === 'dirty' || prev.status === 'saving' ? prev : { status: 'dirty' },
        );
      const validator = autoSaveValidatorRef.current;
      if (validator && !validator(currentVersion)) {
        return;
      }
      void saveContent();
    }
  }, [currentVersion, backupVersion, store, saveContent]);

  return { setAutoSaveValidator };
};
