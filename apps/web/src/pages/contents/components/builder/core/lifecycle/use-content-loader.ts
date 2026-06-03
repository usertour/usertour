import { useGetContentLazyQuery } from '@usertour/hooks';
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

// The Provider's content-loading primitive. A SINGLE getContent fetch
// hydrates both the content and its editable version: getContent returns
// `editedVersion` inline (data/config/themeId/steps), so there's no
// separate getContentVersion round-trip. Writes currentContent /
// currentVersion / backupVersion into the store; currentVersion goes
// through setCurrentVersionFromServer so save round-trips don't pollute
// the undo stack. Called by useBuilderInit (initial controlled hydrate)
// and useSaveContent (post-save re-baseline).
//
// `versionId` is the editable version the builder edits — always the
// content's editedVersionId — so the inline `editedVersion` is exactly
// the version to load.
export const useContentLoader = (args: UseContentLoaderArgs): UseContentLoaderReturn => {
  const { store } = args;
  const { invoke: getContent } = useGetContentLazyQuery();

  const fetchContentAndVersion = useCallback<BuilderProviderMethods['fetchContentAndVersion']>(
    async (contentId, versionId) => {
      if (!contentId || !versionId) {
        return null;
      }
      const content = (await getContent(contentId)) as Content | null;
      if (!content) {
        return null;
      }
      const version = content.editedVersion;
      if (!version) {
        return null;
      }
      const state = store.getState();
      state.setCurrentContent(content);
      // Two independent deep clones: currentVersion is the mutable draft,
      // backupVersion the pristine baseline for dirty-diffing — they must
      // not share references. setCurrentVersionFromServer bypasses the
      // patch-capturing public setter so the load doesn't enter undo history.
      state.setCurrentVersionFromServer(structuredClone(version) as ContentVersion);
      state.setBackupVersion(structuredClone(version) as ContentVersion);
      return { content, version: version as ContentVersion };
    },
    [getContent, store],
  );

  return { fetchContentAndVersion };
};
