import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentVersion } from '@/hooks/use-content-version';
import { useCreateContentVersionMutation, useUpdateContentVersionMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { ContentConfigObject } from '@usertour/types';
import { useToast } from '@usertour/ui';
import { useCallback, useEffect, useMemo } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { resolveEditableVersionId } from '@/utils/content';

export const useContentVersionUpdate = () => {
  const { contentId, beginSaving, endSaving, setDataPending, setConfigPending } =
    useContentDetailUI();
  const { content, refetch: refetchContent } = useContentDetail(contentId);
  const { version } = useContentVersion(content?.editedVersionId);
  const { invoke: updateContentVersion } = useUpdateContentVersionMutation();
  const { invoke: createContentVersion } = useCreateContentVersionMutation();
  const { toast } = useToast();

  /**
   * If the current version is published, fork it and return the new editable
   * version ID. Otherwise return the current version ID directly.
   *
   * Forward `configOverride` as-is — do NOT fall back to `version.config`. A data
   * / theme / scheduledAt save calls this with no override and must fork WITHOUT
   * carrying config: the server then keeps the source version's config (fork) or
   * leaves the reused draft's config untouched (reuse). Falling back to
   * version.config made every such save ship this client's pre-edit config,
   * which the reuse branch would apply — silently reverting a concurrent
   * targeting edit. Only a real config save passes configOverride.
   */
  const ensureEditableVersionId = useCallback(
    async (configOverride?: ContentConfigObject): Promise<string> => {
      if (!version || !content) throw new Error('Missing version or content');
      return resolveEditableVersionId(content, version.id, createContentVersion, configOverride);
    },
    [version, content, createContentVersion],
  );

  // Write a partial payload to the editable version (the data save below):
  // ensureEditableVersionId forks first if the current version is published,
  // then we write the payload. The normalized cache updates Version:id from the
  // mutation response, so only a fork refetches content (details inside). The
  // config (autostart-rules) save uses processVersion instead — it sets config
  // during the fork and skips the redundant update.
  //
  // Flag-agnostic on purpose: each caller brackets the save indicator with one
  // begin/endSaving obligation around its own write, since the data / theme /
  // scheduledAt writes can overlap and a shared bool can't model that.
  const updateEditableVersion = useCallback(
    async (payload: {
      themeId?: string;
      data?: unknown;
      config?: unknown;
      scheduledAt?: Date | null;
    }) => {
      if (!version || !content) return;
      try {
        const editableVersionId = await ensureEditableVersionId();
        const forked = editableVersionId !== version.id;
        await updateContentVersion(editableVersionId, payload);
        // updateContentVersion returns the full version, so the normalized cache
        // updates Version:id in place — no refetch needed. Only a fork does:
        // createContentVersion doesn't return the parent content's new
        // editedVersionId, so refetch content to repoint useContentVersion at the
        // new id. (The version-list refresh is already handled by
        // useCreateContentVersionMutation's refetchQueries.)
        if (forked) {
          await refetchContent();
        }
      } catch (error) {
        toast({ variant: 'destructive', title: getErrorMessage(error) });
      }
    },
    [version, content, ensureEditableVersionId, updateContentVersion, refetchContent, toast],
  );

  /**
   * Save version data (the `data` JSON field) with published-fork safety.
   *
   * Sends ONLY `data`. Server-side scalar updates are partial (Prisma writes
   * just the provided columns), so themeId/config/scheduledAt are preserved
   * untouched. Including them here would write back the stale snapshot captured
   * in this closure and clobber a concurrent theme / autostart-rules edit.
   */
  const saveVersionData = useCallback(
    async (newData: unknown) => {
      beginSaving();
      try {
        await updateEditableVersion({ data: newData });
      } finally {
        endSaving();
      }
    },
    [updateEditableVersion, beginSaving, endSaving],
  );

  // Debounced data save — used by editors that write on every keystroke
  // (announcement title / intro / detail content) so we coalesce bursts into
  // a single mutation. Server-side scalar updates are partial (Prisma only
  // writes the provided columns), so this never clobbers theme / config /
  // scheduledAt.
  //
  // The buffered ~500ms window before the write fires must also gate publish,
  // else a publish there would ship the pre-debounce server data while the
  // latest edit is still buffered. `dataPending` covers that window: set the
  // moment an edit is queued, cleared only after the fired write has taken its
  // in-flight obligation (saveVersionData calls beginSaving synchronously before
  // we clear pending, so isSaving never dips across the handoff — and a newer
  // keystroke arriving mid-write re-sets dataPending). The unmount effect below
  // flushes any still-pending write so the edit isn't lost and pending can't leak.
  const rawDebouncedSaveVersionData = useDebouncedCallback((newData: unknown) => {
    saveVersionData(newData);
    setDataPending(false);
  }, 500);

  const debouncedSaveVersionData = useCallback(
    (newData: unknown) => {
      setDataPending(true);
      rawDebouncedSaveVersionData(newData);
    },
    [rawDebouncedSaveVersionData, setDataPending],
  );

  /** Save the version's theme (published-fork safe). */
  const saveVersionTheme = useCallback(
    async (themeId: string) => {
      beginSaving();
      try {
        await updateEditableVersion({ themeId });
      } finally {
        endSaving();
      }
    },
    [updateEditableVersion, beginSaving, endSaving],
  );

  /**
   * Save the version's scheduled publish time. `null` clears the schedule
   * (publish immediately). Only the scalar is written — see the partial-update
   * note above.
   */
  const saveVersionScheduledAt = useCallback(
    async (scheduledAt: Date | null) => {
      beginSaving();
      try {
        await updateEditableVersion({ scheduledAt });
      } finally {
        endSaving();
      }
    },
    [updateEditableVersion, beginSaving, endSaving],
  );

  const processVersion = useCallback(
    async (cfg: ContentConfigObject) => {
      if (!cfg || !version || !content) {
        return false;
      }

      try {
        const editableVersionId = await ensureEditableVersionId(cfg);
        const forked = editableVersionId !== version.id;

        if (forked) {
          // The fork already applied cfg server-side WITH regenerated condition
          // ids (both the fork and the draft-reuse branch of createContentVersion
          // do this). Writing cfg again here would overwrite those fresh ids
          // with the stale ones this client still holds — on republish the SDK
          // dedupes conditions by id and would keep evaluating the pre-edit
          // definition. So only refetch to repoint useContentVersion at the new
          // draft; don't re-send config.
          await refetchContent();
        } else {
          // Editing an existing editable draft (no fork happened): the server
          // hasn't applied cfg, so write it. ONLY config — partial scalar
          // updates preserve data/themeId, so this never clobbers a concurrent
          // data / theme edit.
          const updated = await updateContentVersion(editableVersionId, { config: cfg });
          if (!updated?.id) {
            throw new Error('Failed to update version');
          }
        }
        return true;
      } catch (error) {
        console.error('Failed to process version:', error);
        throw error;
      }
    },
    [version, content, ensureEditableVersionId, updateContentVersion, refetchContent],
  );

  const updateVersion = useCallback(
    async (cfg: ContentConfigObject) => {
      beginSaving();
      try {
        await processVersion(cfg);

        toast({
          variant: 'success',
          title: 'The flow updated successfully.',
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: getErrorMessage(error),
        });
      } finally {
        endSaving();
      }
    },
    [processVersion, beginSaving, endSaving, toast],
  );

  const rawDebouncedUpdateVersion = useDebouncedCallback((cfg: ContentConfigObject) => {
    updateVersion(cfg);
    setConfigPending(false);
  }, 500);

  // Flag the config-save the moment an edit is queued, not when the timer fires,
  // so publish (gated on isSaving) can't ship pre-debounce targeting. Mirrors the
  // data path: configPending covers the buffered window (updateVersion brackets
  // the in-flight count before we clear pending), cancel() (rules cleared to
  // empty) clears it for the dropped edit, and it's kept on its own flag so it
  // can't clear a pending data save. Object.assign preserves .cancel for callers.
  const debouncedUpdateVersion = useMemo(
    () =>
      Object.assign(
        (cfg: ContentConfigObject) => {
          setConfigPending(true);
          rawDebouncedUpdateVersion(cfg);
        },
        {
          cancel: () => {
            rawDebouncedUpdateVersion.cancel();
            setConfigPending(false);
          },
        },
      ),
    [rawDebouncedUpdateVersion, setConfigPending],
  );

  // use-debounce silently drops a pending trailing call on unmount, which would
  // both lose the buffered edit and leak its pending flag (isSaving stuck true in
  // the still-mounted provider). Flush on unmount instead: it fires the pending
  // write, which persists the edit and clears the pending flag.
  useEffect(() => {
    return () => {
      rawDebouncedSaveVersionData.flush();
      rawDebouncedUpdateVersion.flush();
    };
  }, [rawDebouncedSaveVersionData, rawDebouncedUpdateVersion]);

  return {
    debouncedUpdateVersion,
    saveVersionData,
    debouncedSaveVersionData,
    saveVersionTheme,
    saveVersionScheduledAt,
  };
};
