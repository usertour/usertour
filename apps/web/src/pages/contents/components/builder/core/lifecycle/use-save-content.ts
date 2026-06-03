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
//   step list — and returns the updated version. We re-baseline directly from
//   that response: no second mutation, no follow-up fetch. Steps are upserted
//   server-side by cvid (front-end-generated), so create / update / delete /
//   reorder all ride one call; a new step carries a cvid but no id, and the
//   server assigns the primary id which the re-baseline carries back.
//
// In-flight identity — a monotonic saveCounterRef tracks the latest dispatched
// save. Older responses are ignored once a newer save has started; the server
// is idempotent on cvid, so we let older requests resolve and discard their
// responses rather than aborting at the HTTP level.
export const useSaveContent = (args: UseSaveContentArgs): UseSaveContentReturn => {
  const { store } = args;
  const { toast } = useToast();
  const { invoke: updateVersion } = useUpdateContentVersionMutation();

  // Monotonic counter for in-flight save identity. Per-Provider-mount.
  const saveCounterRef = useRef(0);

  const saveContent = useCallback<BuilderProviderMethods['saveContent']>(async () => {
    const { currentVersion, backupVersion } = store.getState();
    if (!currentVersion || !backupVersion || isEqual(currentVersion, backupVersion)) {
      return;
    }
    debug('saveContent:', currentVersion);
    if (!currentVersion.id) {
      return;
    }

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
      // A newer save started while this one was in flight — discard ours; the
      // newer save drives the final saveState transition.
      if (saveId !== saveCounterRef.current) {
        return;
      }
      if (saved) {
        // Re-baseline straight from the mutation response: currentVersion
        // (draft) and backupVersion (dirty baseline) both become the server's
        // latest. setCurrentVersionFromServer bypasses undo-history capture so
        // the save round-trip doesn't pollute the undo stack; two independent
        // clones keep draft and baseline from sharing references.
        const state = store.getState();
        state.setCurrentVersionFromServer(structuredClone(saved));
        state.setBackupVersion(structuredClone(saved));
        state.transitionSaveState({ status: 'saved', savedAt: Date.now() });
      } else {
        // Nullish response — the wrapper hook swallowed a "no data" server
        // reply without throwing, so the catch below never runs. Surface it
        // here, otherwise saveState wedges at 'saving' forever.
        const err = new Error('Save failed: the server returned no data.');
        store.getState().transitionSaveState({ status: 'error', error: err });
        toast({
          variant: 'destructive',
          title: 'Save failed',
        });
      }
    } catch (error) {
      if (saveId !== saveCounterRef.current) {
        return;
      }
      const err = error instanceof Error ? error : new Error(getErrorMessage(error));
      store.getState().transitionSaveState({ status: 'error', error: err });
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  }, [updateVersion, store, toast]);

  return { saveContent };
};
