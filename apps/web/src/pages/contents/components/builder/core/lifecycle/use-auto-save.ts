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

// Auto-save driver. Subscribes to currentVersion + backupVersion diff. On a
// diff it marks saveState 'dirty' immediately, then DEBOUNCES the actual save:
// each edit resets the timer, so a burst of keystrokes persists once typing
// pauses rather than firing one whole-version request per character (the
// data-blob editors — launcher/banner/checklist — write the whole version on
// every change). Saves are also serialized inside saveContent, so even
// back-to-back fires never overlap into a request race; see useSaveContent.
//
// Per-type editors can register an `autoSaveValidator` predicate that
// runs before each auto-save cycle. A veto keeps saveState = 'dirty'
// but skips THIS auto-save invocation; explicit Save (saveContent
// called from a button) bypasses the validator entirely. Used by
// Launcher to avoid persisting incomplete action chips while the user
// is mid-edit.

// Pause after the last edit before the network save fires. Long enough to
// collapse a typing burst into one whole-version save, short enough that a
// brief stop still persists promptly.
const AUTO_SAVE_DEBOUNCE_MS = 500;

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

  // Pending debounced auto-save timer (per-Provider-mount).
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (isEqual(currentVersion, backupVersion)) {
      return;
    }
    // Reflect the unsaved edit in the UI immediately…
    store
      .getState()
      .transitionSaveState((prev) =>
        prev.status === 'dirty' || prev.status === 'saving' ? prev : { status: 'dirty' },
      );
    // …but debounce the network save: every edit re-runs this effect and resets
    // the timer, so only a pause in editing actually fires saveContent.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      // Re-read at fire time: validate the LATEST draft, not the snapshot that
      // scheduled this timer. A veto keeps saveState 'dirty' and skips this
      // cycle (the next edit reschedules); explicit Save bypasses the validator.
      const latest = store.getState().currentVersion;
      const validator = autoSaveValidatorRef.current;
      if (latest && validator && !validator(latest)) {
        return;
      }
      void saveContentRef.current();
    }, AUTO_SAVE_DEBOUNCE_MS);
  }, [currentVersion, backupVersion, store]);

  // Drop a pending debounced save on unmount: the leave guard's explicit
  // saveContent persists the final draft, so this only prevents a fire (and its
  // setState) from a timer that outlived the Provider.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return { setAutoSaveValidator };
};
