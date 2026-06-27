import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentVersion } from '@/hooks/use-content-version';
import { useCreateContentVersionMutation, useUpdateContentVersionMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { ContentConfigObject } from '@usertour/types';
import { useToast } from '@usertour/ui';
import { useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { resolveEditableVersionId } from '@/utils/content';

export const useContentVersionUpdate = () => {
  const { contentId, setIsSaving } = useContentDetailUI();
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
  const updateEditableVersion = useCallback(
    async (payload: {
      themeId?: string;
      data?: unknown;
      config?: unknown;
      scheduledAt?: Date | null;
    }) => {
      if (!version || !content) return;
      try {
        setIsSaving(true);
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
      } finally {
        setIsSaving(false);
      }
    },
    [
      version,
      content,
      ensureEditableVersionId,
      updateContentVersion,
      refetchContent,
      setIsSaving,
      toast,
    ],
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
    (newData: unknown) => updateEditableVersion({ data: newData }),
    [updateEditableVersion],
  );

  // Debounced data save — used by editors that write on every keystroke
  // (announcement title / intro / detail content) so we coalesce bursts into
  // a single mutation. Server-side scalar updates are partial (Prisma only
  // writes the provided columns), so this never clobbers theme / config /
  // scheduledAt.
  const rawDebouncedSaveVersionData = useDebouncedCallback((newData: unknown) => {
    saveVersionData(newData);
  }, 500);

  // Flag isSaving the moment an edit is queued, not when the timer fires.
  // Publish is gated on isSaving, so without this the ~500ms pending window
  // would let a publish ship the pre-debounce server data while the latest
  // edit is still buffered. updateEditableVersion's finally clears it once the
  // coalesced write has committed (after which the server holds the latest).
  const debouncedSaveVersionData = useCallback(
    (newData: unknown) => {
      setIsSaving(true);
      rawDebouncedSaveVersionData(newData);
    },
    [rawDebouncedSaveVersionData, setIsSaving],
  );

  /** Save the version's theme (published-fork safe). */
  const saveVersionTheme = useCallback(
    (themeId: string) => updateEditableVersion({ themeId }),
    [updateEditableVersion],
  );

  /**
   * Save the version's scheduled publish time. `null` clears the schedule
   * (publish immediately). Only the scalar is written — see the partial-update
   * note above.
   */
  const saveVersionScheduledAt = useCallback(
    (scheduledAt: Date | null) => updateEditableVersion({ scheduledAt }),
    [updateEditableVersion],
  );

  const processVersion = useCallback(
    async (cfg: ContentConfigObject) => {
      if (!cfg || !version || !content) {
        return false;
      }

      try {
        const editableVersionId = await ensureEditableVersionId(cfg);
        const forked = editableVersionId !== version.id;

        // If we forked, config was already set during fork — done.
        // If not forked, we need to update config explicitly.
        if (!forked) {
          const updated = await updateContentVersion(version.id, {
            themeId: version.themeId,
            data: version.data,
            config: cfg,
          });

          if (!updated?.id) {
            throw new Error('Failed to update version');
          }
          // updateContentVersion returns the full version → the normalized
          // cache updates Version:id in place, no refetch needed.
          return true;
        }

        // Fork: createContentVersion doesn't return the parent content's new
        // editedVersionId, so refetch content to repoint useContentVersion at
        // the new id (which then cache-and-network-fetches the new version).
        // The version-list refresh is already done by
        // useCreateContentVersionMutation's refetchQueries.
        await refetchContent();
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
        setIsSaving(true);
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
        setIsSaving(false);
      }
    },
    [processVersion, setIsSaving, toast],
  );

  // Create a debounced version of updateVersion
  const debouncedUpdateVersion = useDebouncedCallback((cfg: ContentConfigObject) => {
    updateVersion(cfg);
  }, 500);

  return {
    debouncedUpdateVersion,
    saveVersionData,
    debouncedSaveVersionData,
    saveVersionTheme,
    saveVersionScheduledAt,
  };
};
