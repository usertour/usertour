import { getErrorMessage, isEqual } from '@usertour/helpers';
import { useAddContentStepsMutation, useUpdateContentVersionMutation } from '@usertour/hooks';
import { useToast } from '@usertour/ui';
import { useCallback, useRef } from 'react';
import type { BuilderProviderMethods } from '@/pages/contents/components/builder/core/types';
import type { BuilderStore } from '@/pages/contents/components/builder/core/builder-store';
import { debug } from '@/pages/contents/components/builder/core/utils/logger';

export interface UseSaveContentArgs {
  store: BuilderStore;
  fetchContentAndVersion: BuilderProviderMethods['fetchContentAndVersion'];
}

export interface UseSaveContentReturn {
  saveContent: BuilderProviderMethods['saveContent'];
}

// Save FSM driver. Two responsibilities:
//
//   1. Dispatcher — pick which mutation(s) to fire based on what's
//      dirty: `addContentSteps` writes steps + themeId, `updateContentVersion`
//      writes the per-type data blob. Per-type editors drop their own
//      save loops and route through this FSM via setCurrentVersion.
//
//   2. In-flight identity — a monotonic counter (saveCounterRef)
//      tracks the latest dispatched save. Older responses are ignored
//      when a newer save has started; the server is idempotent on the
//      (versionId, payload) tuple so we let older requests resolve and
//      discard their responses rather than aborting at the HTTP level.
export const useSaveContent = (args: UseSaveContentArgs): UseSaveContentReturn => {
  const { store, fetchContentAndVersion } = args;
  const { toast } = useToast();
  const { invoke: addContentSteps } = useAddContentStepsMutation();
  const { invoke: updateContentVersion } = useUpdateContentVersionMutation();

  // Monotonic counter for in-flight save identity. Per-Provider-mount
  // (useRef preserves across renders).
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

    const stepsDirty =
      !isEqual(currentVersion.steps, backupVersion.steps) ||
      currentVersion.themeId !== backupVersion.themeId;
    const dataDirty = !isEqual(currentVersion.data, backupVersion.data);
    if (!stepsDirty && !dataDirty) {
      return;
    }

    const saveId = ++saveCounterRef.current;
    store.getState().transitionSaveState({ status: 'saving', saveId });

    const pending: Array<Promise<unknown>> = [];
    if (stepsDirty) {
      const steps = currentVersion.steps
        ? currentVersion.steps.map(({ updatedAt, createdAt, cvid, ...step }, index) => ({
            ...step,
            sequence: index,
          }))
        : [];
      pending.push(
        addContentSteps({
          contentId: currentVersion.contentId,
          versionId: currentVersion.id,
          themeId: currentVersion.themeId,
          steps,
        }),
      );
    }
    if (dataDirty) {
      pending.push(updateContentVersion(currentVersion.id, { data: currentVersion.data }));
    }

    try {
      const responses = await Promise.all(pending);
      // Identity check: a newer save has started while this one was in
      // flight — discard our response. The newer save will drive the
      // final saveState transition.
      if (saveId !== saveCounterRef.current) {
        return;
      }
      // Treat the save as successful if every dispatched mutation
      // resolved truthy (addContentSteps + updateContentVersion both
      // return data objects on success; nullish means the wrapper hook
      // swallowed an error without throwing).
      const allOk = responses.every((r) => Boolean(r));
      if (allOk) {
        await fetchContentAndVersion(currentVersion.contentId, currentVersion.id);
        if (saveId === saveCounterRef.current) {
          store.getState().transitionSaveState({ status: 'saved', savedAt: Date.now() });
        }
      } else {
        // A dispatched mutation resolved nullish — the wrapper hook
        // swallowed a server "no data" response without throwing, so the
        // catch below never runs. Surface it as an error here, otherwise
        // saveState is stuck at 'saving' forever and the leave guard +
        // footer spinners wedge with no feedback. (The line-87 identity
        // guard already returned for superseded saves, so we're current.)
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
  }, [addContentSteps, updateContentVersion, fetchContentAndVersion, store, toast]);

  return { saveContent };
};
