import { isEqual } from '@usertour/helpers';
import type { ContentVersion } from '@usertour/types';
import { useCallback, useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import type { BuilderProviderMethods } from '@/pages/contents/components/builder/core/types';
import type { BuilderStore } from '@/pages/contents/components/builder/core/builder-store';

export interface UseAutoSaveArgs {
  store: BuilderStore;
  saveContent: BuilderProviderMethods['saveContent'];
}

export interface UseAutoSaveReturn {
  setAutoSaveValidator: BuilderProviderMethods['setAutoSaveValidator'];
}

// Auto-save driver. Subscribes to currentVersion + backupVersion diff.
// On dirty → transitions saveState to 'dirty' and triggers a save (saves are
// serialized inside saveContent, so rapid edits never overlap into a request
// race; see useSaveContent).
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

  // Auto-save fires on CONTENT changes (currentVersion vs backupVersion),
  // never on saveContent's identity. Holding saveContent in a latest-ref keeps
  // it out of the effect deps — the standard pattern for an effect that calls
  // a callback without wanting to re-run when the callback's identity changes.
  // saveContent is in fact stable now (its Apollo invokes are useCallback'd),
  // but the ref keeps auto-save robust regardless: were its identity to become
  // unstable again, listing it in deps would re-mount the effect every render
  // and, while dirty, kick off a fresh save each time — the infinite loop this
  // path is careful to avoid.
  const saveContentRef = useRef(saveContent);
  saveContentRef.current = saveContent;

  const currentVersion = useStore(store, (s) => s.currentVersion);
  const backupVersion = useStore(store, (s) => s.backupVersion);
  useEffect(() => {
    if (!currentVersion || !backupVersion) {
      return;
    }
    // A detected version conflict is terminal for this mount — the draft can
    // never be saved and the conflict dialog owns the exit (refresh). Stop
    // auto-save from re-firing a doomed request on every further edit.
    if (store.getState().saveState.status === 'conflict') {
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
      void saveContentRef.current();
    }
  }, [currentVersion, backupVersion, store]);

  return { setAutoSaveValidator };
};
