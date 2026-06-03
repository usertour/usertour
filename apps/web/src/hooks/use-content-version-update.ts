import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentVersion } from '@/hooks/use-content-version';
import { useCreateContentVersionMutation, useUpdateContentVersionMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { ContentConfigObject } from '@usertour/types';
import { useToast } from '@usertour/ui';
import { useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { isVersionPublished } from '@/utils/content';

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

      if (!isVersionPublished(content, version.id)) {
        return version.id;
      }

      const result = await createContentVersion({
        versionId: version.id,
        config: configOverride ?? version.config,
      });

      const newVersionId = result?.id;
      if (!newVersionId) throw new Error('Failed to create new version');
      return newVersionId;
    },
    [version, content, createContentVersion],
  );

  // Write a partial payload (data / theme / scheduledAt) to the editable
  // version, shared by the single-field saves below: ensureEditableVersionId
  // forks first if the current version is published, then we write the payload.
  // The normalized cache updates Version:id from the mutation response, so only
  // a fork refetches content (details inside). The config (autostart-rules) save
  // uses processVersion instead — it sets config during the fork and skips the
  // redundant update.
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
   */
  const saveVersionData = useCallback(
    (newData: unknown) =>
      updateEditableVersion({ themeId: version?.themeId, data: newData, config: version?.config }),
    [updateEditableVersion, version?.themeId, version?.config],
  );

  const debouncedSaveVersionData = useDebouncedCallback((newData: unknown) => {
    saveVersionData(newData);
  }, 800);

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

  /**
   * Update themeId with published-fork safety.
   */
  const saveVersionTheme = useCallback(
    (themeId: string) => updateEditableVersion({ themeId }),
    [updateEditableVersion],
  );

  /**
   * Update scheduledAt with published-fork safety.
   */
  const saveVersionScheduledAt = useCallback(
    (scheduledAt: Date | null) => updateEditableVersion({ scheduledAt }),
    [updateEditableVersion],
  );

  return {
    updateVersion,
    debouncedUpdateVersion,
    ensureEditableVersionId,
    saveVersionData,
    debouncedSaveVersionData,
    saveVersionTheme,
    saveVersionScheduledAt,
  };
};
