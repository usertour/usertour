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

  const processVersion = useCallback(
    async (cfg: ContentConfigObject) => {
      if (!cfg || !version || !content) {
        return false;
      }

      try {
        // Check if we need to create a new version (when published version is being edited)

        if (isVersionPublished(content, version.id)) {
          const { data } = await createVersion({
            variables: {
              data: {
                versionId: version.id,
                config: cfg,
              },
            },
          });

          if (!data?.createContentVersion?.id) {
            throw new Error('Failed to create new version');
          }
        } else {
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

        // Refresh data after successful operation
        await Promise.all([refetchContent(), refetchVersion()]);
        return true;
      } catch (error) {
        console.error('Failed to process version:', error);
        throw error; // Re-throw to let updateVersion handle it
      }
    },
    [version, content, createVersion, mutation, refetchContent, refetchVersion],
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
    updateVersion,
    debouncedUpdateVersion,
  };
};
