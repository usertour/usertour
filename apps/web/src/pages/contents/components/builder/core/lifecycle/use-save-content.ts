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
  const { t } = useTranslation();
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
        title: t('contentBuilder.common.saveFailed'),
      });
      return false;
    } catch (error) {
      if (saveId !== saveCounterRef.current) {
        return true;
      }
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

  return { saveContent };
};
