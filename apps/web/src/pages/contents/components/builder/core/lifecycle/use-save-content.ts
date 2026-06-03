import { getErrorMessage, isEqual } from '@usertour/helpers';
import { useUpdateContentVersionMutation } from '@usertour/hooks';
import { useToast } from '@usertour/ui';
import { useCallback, useRef } from 'react';
import type { BuilderProviderMethods } from '@/pages/contents/components/builder/core/types';
import type { BuilderStore } from '@/pages/contents/components/builder/core/builder-store';
import { debug } from '@/utils/logger';

export interface UseSaveContentArgs {
  store: BuilderStore;
}

export interface UseSaveContentReturn {
  saveContent: BuilderProviderMethods['saveContent'];
}

// Save FSM driver. One round-trip per save:
//
//   updateContentVersion persists the WHOLE version — themeId + data + the full
//   step list — and returns the updated version. Steps are upserted by cvid
//   (front-end-generated), so create / update / delete / reorder ride one call;
//   a new step carries a cvid but no id until save, when the server assigns the
//   primary id which the re-baseline carries back.
//
// Returns true when the version is saved (or there was nothing to save), false
// when the save failed — callers like the leave guard use this to decide
// whether it's safe to navigate away.
//
// Two race protections:
//   - In-flight identity: a monotonic saveCounterRef tracks the latest
//     dispatched save; an older response is discarded once a newer save started.
//   - Edit-during-save: re-baseline overwrites currentVersion ONLY if the draft
//     is still the snapshot we dispatched. If edits landed mid-save (notably the
//     validator-veto path, which doesn't trigger a new save), we keep the draft
//     and only re-baseline backupVersion — the draft stays dirty vs the new
//     baseline and auto-save persists it next. (The server id for new steps is
//     backfilled on that next save, upserted by cvid.)
export const useSaveContent = (args: UseSaveContentArgs): UseSaveContentReturn => {
  const { store } = args;
  const { toast } = useToast();
  const { invoke: updateVersion } = useUpdateContentVersionMutation();

  // Monotonic counter for in-flight save identity. Per-Provider-mount.
  const saveCounterRef = useRef(0);

  const saveContent = useCallback<BuilderProviderMethods['saveContent']>(async () => {
    const { currentVersion, backupVersion } = store.getState();
    if (!currentVersion || !backupVersion || isEqual(currentVersion, backupVersion)) {
      return true; // nothing to save — safe to leave
    }
    debug('saveContent:', currentVersion);
    if (!currentVersion.id) {
      return false;
    }

    // Reference snapshot of the dispatched draft (see header comment).
    const dispatched = currentVersion;
    const saveId = ++saveCounterRef.current;
    store.getState().transitionSaveState({ status: 'saving', saveId });

    // Keep cvid (the server's upsert key) and id; strip only the server-managed
    // timestamps. A new step has a cvid but no id — the server creates it.
    const steps = currentVersion.steps
      ? currentVersion.steps.map(({ updatedAt, createdAt, ...step }, index) => ({
          ...step,
          sequence: index,
        }))
      : [];

    try {
      const saved = await updateVersion(currentVersion.id, {
        themeId: currentVersion.themeId,
        data: currentVersion.data,
        steps,
      });
      // A newer save started while this one was in flight — it owns the final
      // transition; treat ours as a no-op success.
      if (saveId !== saveCounterRef.current) {
        return true;
      }
      if (saved) {
        const state = store.getState();
        // Overwrite the draft only if it wasn't edited during the save — else
        // keep the user's in-flight edits (they re-save against the new
        // baseline). backupVersion always becomes the server's latest.
        if (state.currentVersion === dispatched) {
          state.setCurrentVersionFromServer(structuredClone(saved));
        }
        state.setBackupVersion(structuredClone(saved));
        state.transitionSaveState({ status: 'saved', savedAt: Date.now() });
        return true;
      }
      // Nullish response — the wrapper hook swallowed a "no data" server reply
      // without throwing, so the catch below never runs. Surface it here,
      // otherwise saveState wedges at 'saving' forever.
      const err = new Error('Save failed: the server returned no data.');
      store.getState().transitionSaveState({ status: 'error', error: err });
      toast({
        variant: 'destructive',
        title: 'Save failed',
      });
      return false;
    } catch (error) {
      if (saveId !== saveCounterRef.current) {
        return true;
      }
      const err = error instanceof Error ? error : new Error(getErrorMessage(error));
      store.getState().transitionSaveState({ status: 'error', error: err });
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      return false;
    }
  }, [updateVersion, store, toast]);

  return { saveContent };
};
