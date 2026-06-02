import { useGetContentLazyQuery, useGetContentVersionLazyQuery } from '@usertour/hooks';
import type { Content, ContentVersion } from '@usertour/types';
import { useCallback } from 'react';
import type { BuilderProviderMethods } from '@/pages/contents/components/builder/core/types';
import type { BuilderStore } from '@/pages/contents/components/builder/core/builder-store';

export interface UseContentLoaderArgs {
  store: BuilderStore;
}

export interface UseContentLoaderReturn {
  fetchContentAndVersion: BuilderProviderMethods['fetchContentAndVersion'];
}

// The Provider's content-loading primitive. Fetches the content + its
// version via the Apollo lazy queries, then writes currentContent /
// currentVersion / backupVersion into the store. currentVersion goes
// through setCurrentVersionFromServer so save round-trips don't pollute
// the undo stack. Both fetches must succeed before any write, so a
// failure never leaves the store half-updated. Called by useBuilderInit
// (initial controlled hydrate) and useSaveContent (post-save re-baseline).
export const useContentLoader = (args: UseContentLoaderArgs): UseContentLoaderReturn => {
  const { store } = args;
  const { invoke: getContent } = useGetContentLazyQuery();
  const { invoke: getContentVersion } = useGetContentVersionLazyQuery();

  const fetchContentAndVersion = useCallback<BuilderProviderMethods['fetchContentAndVersion']>(
    async (contentId, versionId) => {
      if (!contentId || !versionId) {
        return null;
      }
      const content = await getContent(contentId);
      if (!content) {
        return null;
      }
      const version = await getContentVersion(versionId);
      if (!version) {
        return null;
      }
      // Both fetched — write atomically so a failed version fetch never
      // leaves currentContent updated against a stale version.
      const state = store.getState();
      state.setCurrentContent(content as Content);
      // Two independent deep clones: currentVersion is the mutable draft,
      // backupVersion the pristine baseline for dirty-diffing — they must
      // not share references. setCurrentVersionFromServer bypasses the
      // patch-capturing public setter so the load doesn't enter undo history.
      state.setCurrentVersionFromServer(structuredClone(version) as ContentVersion);
      state.setBackupVersion(structuredClone(version) as ContentVersion);
      return { content: content as Content, version: version as ContentVersion };
    },
    [getContent, getContentVersion, store],
  );

  return { fetchContentAndVersion };
};
