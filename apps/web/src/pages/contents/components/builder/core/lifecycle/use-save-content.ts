import { getErrorMessage, isEqual } from '@usertour/helpers';
import { useUpdateContentVersionMutation } from '@usertour/hooks';
import { useToast } from '@usertour/ui';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { BuilderProviderMethods } from '@/pages/contents/components/builder/core/types';
import type { BuilderStore } from '@/pages/contents/components/builder/core/builder-store';
import { debug } from '@/utils/logger';

export interface UseSaveContentArgs {
  store: BuilderStore;
}

export interface UseSaveContentReturn {
  saveContent: BuilderProviderMethods['saveContent'];
}

// Server codes that mean "this draft can never be saved from this mount":
// E0049 version no longer editable (forked elsewhere), E0050 optimistic-lock
// conflict (someone else saved since our baseline).
const VERSION_CONFLICT_CODES = new Set(['E0049', 'E0050']);

const isVersionConflictError = (error: unknown): boolean => {
  const graphQLErrors = (error as { graphQLErrors?: { extensions?: { code?: unknown } }[] })
    ?.graphQLErrors;
  if (!graphQLErrors) {
    return false;
  }
  return graphQLErrors.some(
    (gqlError) =>
      typeof gqlError.extensions?.code === 'string' &&
      VERSION_CONFLICT_CODES.has(gqlError.extensions.code),
  );
};

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
// Saves are SERIALIZED (see saveChainRef): never two updateContentVersion
// requests in flight at once. The save carries backupVersion.updatedAt as the
// optimistic-lock baseline; two concurrent saves would both carry the same
// baseline (the second dispatched before the first re-baselines), so the
// second would be rejected as a self-inflicted version conflict (E0050).
// Chaining keeps them strictly ordered — each link reads the latest draft +
// freshly re-baselined updatedAt, so a queued run is either a no-op (draft
// already equals backup) or a clean save against the new baseline.
//
// Edit-during-save: re-baseline overwrites currentVersion ONLY if the draft is
// still the snapshot we dispatched. If edits landed mid-save, we keep the draft
// and only re-baseline backupVersion — the draft stays dirty vs the new
// baseline and auto-save persists it next (server ids for new steps are
// backfilled on that next save, upserted by cvid).
export const useSaveContent = (args: UseSaveContentArgs): UseSaveContentReturn => {
  const { store } = args;
  const { toast } = useToast();
  const { t } = useTranslation();
  const { invoke: updateVersion } = useUpdateContentVersionMutation();

  // Tail of the serialized save chain. Per-Provider-mount.
  const saveChainRef = useRef<Promise<boolean>>(Promise.resolve(true));

  const runSave = useCallback(async (): Promise<boolean> => {
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
    store.getState().transitionSaveState({ status: 'saving' });

    // Keep cvid (the server's upsert key) and id; strip only the server-managed
    // timestamps. A new step has a cvid but no id — the server creates it.
    const steps = currentVersion.steps
      ? currentVersion.steps.map(({ updatedAt, createdAt, ...step }, index) => ({
          ...step,
          sequence: index,
        }))
      : [];

    try {
      const saved = await updateVersion(
        currentVersion.id,
        {
          themeId: currentVersion.themeId,
          data: currentVersion.data,
          steps,
        },
        // Optimistic-lock baseline: the server snapshot we're editing on top
        // of. A concurrent save by someone else bumps the row's updatedAt and
        // this save is rejected (E0050) instead of rolling their work back.
        backupVersion.updatedAt,
      );
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
        title: t('contentBuilder.common.saveFailed'),
      });
      return false;
    } catch (error) {
      // Version conflict is terminal — no toast: the conflict dialog owns
      // the messaging and the exit (refresh), and auto-save stops retrying.
      if (isVersionConflictError(error)) {
        store.getState().transitionSaveState({ status: 'conflict' });
        return false;
      }
      const err = error instanceof Error ? error : new Error(getErrorMessage(error));
      store.getState().transitionSaveState({ status: 'error', error: err });
      console.error('Save failed:', error);
      toast({
        variant: 'destructive',
        title: t('contentBuilder.common.saveFailed'),
      });
      return false;
    }
  }, [updateVersion, store, toast, t]);

  // Queue this save behind any in-flight one so requests never overlap. The
  // `.catch` keeps a failed/rejected link from breaking the chain for the
  // next save; runSave already turns failures into `false` + saveState, so the
  // catch only guards against unexpected throws.
  const saveContent = useCallback<BuilderProviderMethods['saveContent']>(() => {
    const next = saveChainRef.current.catch(() => false).then(() => runSave());
    saveChainRef.current = next;
    return next;
  }, [runSave]);

  return { saveContent };
};
