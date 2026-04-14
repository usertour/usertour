import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { useMutation } from '@apollo/client';
import { createContentVersion, updateContentVersion } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { ContentConfigObject } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { isVersionPublished } from '@/utils/content';

export const useContentVersionUpdate = () => {
  const { version, refetch: refetchVersion, setIsSaving } = useContentVersionContext();
  const { content, refetch: refetchContent } = useContentDetailContext();
  const [mutation] = useMutation(updateContentVersion);
  const [createVersion] = useMutation(createContentVersion);
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

      const result = await createVersion({
        variables: {
          data: {
            versionId: version.id,
            config: configOverride ?? version.config,
          },
        },
      });

      const newVersionId = result.data?.createContentVersion?.id;
      if (!newVersionId) throw new Error('Failed to create new version');
      return newVersionId;
    },
    [version, content, createVersion],
  );

  /**
   * Save version data (the `data` JSON field) with published-fork safety.
   * Fork first if published, then write newData into the editable version.
   */
  const saveVersionData = useCallback(
    async (newData: unknown) => {
      if (!version || !content) return;
      try {
        setIsSaving(true);

        const editableVersionId = await ensureEditableVersionId();
        await mutation({
          variables: {
            versionId: editableVersionId,
            content: {
              themeId: version.themeId,
              data: newData,
              config: version.config,
            },
          },
        });

        await Promise.all([refetchContent(), refetchVersion()]);
      } catch (error) {
        toast({ variant: 'destructive', title: getErrorMessage(error) });
      } finally {
        setIsSaving(false);
      }
    },
    [
      version,
      content,
      mutation,
      ensureEditableVersionId,
      refetchContent,
      refetchVersion,
      setIsSaving,
      toast,
    ],
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

        // If we forked, config was already set during fork — done.
        // If not forked, we need to update config explicitly.
        if (editableVersionId === version.id) {
          const { data } = await mutation({
            variables: {
              versionId: version.id,
              content: {
                themeId: version.themeId,
                data: version.data,
                config: cfg,
              },
            },
          });

          if (!data?.updateContentVersion?.id) {
            throw new Error('Failed to update version');
          }
        }

        await Promise.all([refetchContent(), refetchVersion()]);
        return true;
      } catch (error) {
        console.error('Failed to process version:', error);
        throw error;
      }
    },
    [version, content, ensureEditableVersionId, mutation, refetchContent, refetchVersion],
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
    async (themeId: string) => {
      if (!version || !content) return;
      try {
        setIsSaving(true);

        const editableVersionId = await ensureEditableVersionId();
        await mutation({
          variables: {
            versionId: editableVersionId,
            content: { themeId },
          },
        });

        await Promise.all([refetchContent(), refetchVersion()]);
      } catch (error) {
        toast({ variant: 'destructive', title: getErrorMessage(error) });
      } finally {
        setIsSaving(false);
      }
    },
    [
      version,
      content,
      mutation,
      ensureEditableVersionId,
      refetchContent,
      refetchVersion,
      setIsSaving,
      toast,
    ],
  );

  return {
    updateVersion,
    debouncedUpdateVersion,
    ensureEditableVersionId,
    saveVersionData,
    debouncedSaveVersionData,
    saveVersionTheme,
  };
};
