import { useGetContentLazyQuery, useGetContentVersionLazyQuery } from '@usertour/hooks';
import type { Content, ContentVersion } from '@usertour/types';
import { useCallback } from 'react';
import type { BuilderProviderMethods } from './types';
import type { BuilderStore } from '../store/builder-store';

export interface UseContentLoaderArgs {
  store: BuilderStore;
}

export interface UseContentLoaderReturn {
  fetchContentAndVersion: BuilderProviderMethods['fetchContentAndVersion'];
}

// The Provider's content-loading primitive:
//   - fetchContent / fetchVersion: thin wrappers around the Apollo
//     lazy queries
//   - fetchContentAndVersion: composes the two + writes
//     currentContent / currentVersion / backupVersion into the store.
//     Uses setCurrentVersionFromServer so save round-trips don't pollute
//     the undo stack. Called by useBuilderInit (initial controlled
//     hydrate) and useSaveContent (post-save re-baseline).
export const useContentLoader = (args: UseContentLoaderArgs): UseContentLoaderReturn => {
  const { store } = args;
  const { invoke: getContent } = useGetContentLazyQuery();
  const { invoke: getContentVersion } = useGetContentVersionLazyQuery();

  const fetchContent = useCallback(
    async (contentId: string) => {
      if (!contentId) {
        return false;
      }
      const content = await getContent(contentId);
      if (!content) {
        return false;
      }
      return content as Content;
    },
    [getContent],
  );

  const fetchVersion = useCallback(
    async (versionId: string) => {
      const version = await getContentVersion(versionId);
      if (!version) {
        return false;
      }
      return version as ContentVersion;
    },
    [getContentVersion],
  );

  const fetchContentAndVersion = useCallback<BuilderProviderMethods['fetchContentAndVersion']>(
    async (contentId, versionId) => {
      if (!contentId || !versionId) {
        return false;
      }
      const content = await fetchContent(contentId);
      if (!content) {
        return false;
      }
      const state = store.getState();
      state.setCurrentContent(content);
      const version = await fetchVersion(versionId);
      if (!version) {
        return false;
      }
      // Server-driven write — bypass the patch-capturing public setter
      // so save round-trips don't pollute the undo stack. The user can
      // still undo across a save boundary; the undone state then
      // re-triggers auto-save with the older content.
      state.setCurrentVersionFromServer(JSON.parse(JSON.stringify(version)));
      state.setBackupVersion(JSON.parse(JSON.stringify(version)));
      return { content, version };
    },
    [fetchContent, fetchVersion, store],
  );

  return { fetchContentAndVersion };
};
