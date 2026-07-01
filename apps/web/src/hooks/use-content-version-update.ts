import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentVersion } from '@/hooks/use-content-version';
import { useCreateContentVersionMutation, useUpdateContentVersionMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { ContentConfigObject } from '@usertour/types';
import { useToast } from '@usertour/ui';
import { useCallback, useMemo, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { resolveEditableVersionId } from '@/utils/content';

export const useContentVersionUpdate = () => {
  const { contentId, beginSavingData, endSavingData, setIsSavingConfig } = useContentDetailUI();
  const { content, refetch: refetchContent } = useContentDetail(contentId);
  const { version } = useContentVersion(content?.editedVersionId);
  const { invoke: updateContentVersion } = useUpdateContentVersionMutation();
  const { invoke: createContentVersion } = useCreateContentVersionMutation();
  const { toast } = useToast();

  /**
   * If the current version is published, fork it and return the new editable
   * version ID. Otherwise return the current version ID directly.
   */
  const ensureEditableVersionId = useCallback(
    async (configOverride?: ContentConfigObject): Promise<string> => {
      if (!version || !content) throw new Error('Missing version or content');
      return resolveEditableVersionId(
        content,
        version.id,
        createContentVersion,
        configOverride ?? version.config,
      );
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
  // begin/endSavingData obligation around its own edit, since the data / theme /
  // scheduledAt writes can overlap and a shared flag can't model that.
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
      beginSavingData();
      try {
        await updateEditableVersion({ data: newData });
      } finally {
        endSavingData();
      }
    },
    [updateEditableVersion, beginSavingData, endSavingData],
  );

  // Debounced data save — used by editors that write on every keystroke
  // (announcement title / intro / detail content) so we coalesce bursts into
  // a single mutation. Server-side scalar updates are partial (Prisma only
  // writes the provided columns), so this never clobbers theme / config /
  // scheduledAt.
  //
  // The buffered ~500ms window before the write fires must also gate publish,
  // else a publish there would ship the pre-debounce server data while the
  // latest edit is still buffered. So hold one save obligation from the moment
  // an edit is queued (pendingDataRef coalesces a burst into a single hold) and
  // release it once the coalesced write settles — saveVersionData brackets the
  // write itself, so the count never dips to zero across the buffered→write
  // handoff.
  const pendingDataRef = useRef(false);
  const rawDebouncedSaveVersionData = useDebouncedCallback((newData: unknown) => {
    saveVersionData(newData).finally(() => {
      pendingDataRef.current = false;
      endSavingData();
    });
  }, 500);

  const debouncedSaveVersionData = useCallback(
    (newData: unknown) => {
      if (!pendingDataRef.current) {
        pendingDataRef.current = true;
        beginSavingData();
      }
      rawDebouncedSaveVersionData(newData);
    },
    [rawDebouncedSaveVersionData, beginSavingData],
  );

  /** Save the version's theme (published-fork safe). */
  const saveVersionTheme = useCallback(
    async (themeId: string) => {
      beginSavingData();
      try {
        await updateEditableVersion({ themeId });
      } finally {
        endSavingData();
      }
    },
    [updateEditableVersion, beginSavingData, endSavingData],
  );

  /**
   * Save the version's scheduled publish time. `null` clears the schedule
   * (publish immediately). Only the scalar is written — see the partial-update
   * note above.
   */
  const saveVersionScheduledAt = useCallback(
    async (scheduledAt: Date | null) => {
      beginSavingData();
      try {
        await updateEditableVersion({ scheduledAt });
      } finally {
        endSavingData();
      }
    },
    [updateEditableVersion, beginSavingData, endSavingData],
  );

  const processVersion = useCallback(
    async (cfg: ContentConfigObject) => {
      if (!cfg || !version || !content) {
        return false;
      }

      try {
        const editableVersionId = await ensureEditableVersionId(cfg);
        const forked = editableVersionId !== version.id;

        // Always write config explicitly. A fork only guarantees an editable
        // draft exists — when the server reuses a draft a concurrent data save
        // already forked, it returns that draft WITHOUT our config, so skipping
        // this on `forked` would drop the targeting. Send ONLY config: partial
        // scalar updates preserve data/themeId, so this never clobbers a
        // concurrent data / theme edit (and writes to the new draft when forked).
        const updated = await updateContentVersion(editableVersionId, {
          config: cfg,
        });
        if (!updated?.id) {
          throw new Error('Failed to update version');
        }

        // Fork: createContentVersion doesn't return the parent content's new
        // editedVersionId, so refetch content to repoint useContentVersion at
        // the new id (which then cache-and-network-fetches the new version).
        // The version-list refresh is already done by
        // useCreateContentVersionMutation's refetchQueries.
        if (forked) {
          await refetchContent();
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
      try {
        setIsSavingConfig(true);
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
        setIsSavingConfig(false);
      }
    },
    [processVersion, setIsSavingConfig, toast],
  );

  const rawDebouncedUpdateVersion = useDebouncedCallback((cfg: ContentConfigObject) => {
    updateVersion(cfg);
  }, 500);

  // Flag the config-save the moment an edit is queued, not when the timer fires,
  // so publish (gated on isSaving) can't ship pre-debounce targeting. cancel()
  // (rules cleared to empty) clears the flag for the dropped edit. Kept on its
  // own flag — see content-detail-ui-context — so this can't clear a pending
  // data save. Object.assign preserves .cancel for the editors that call it.
  const debouncedUpdateVersion = useMemo(
    () =>
      Object.assign(
        (cfg: ContentConfigObject) => {
          setIsSavingConfig(true);
          rawDebouncedUpdateVersion(cfg);
        },
        {
          cancel: () => {
            rawDebouncedUpdateVersion.cancel();
            setIsSavingConfig(false);
          },
        },
      ),
    [rawDebouncedUpdateVersion, setIsSavingConfig],
  );

  return {
    debouncedUpdateVersion,
    saveVersionData,
    debouncedSaveVersionData,
    saveVersionTheme,
    saveVersionScheduledAt,
  };
};
