import { defaultStep } from '@usertour/helpers';
import { useGetContentLazyQuery, useGetContentVersionLazyQuery } from '@usertour/hooks';
import { type Content, ContentDataType, type ContentVersion } from '@usertour/types';
import { useCallback } from 'react';
import { BuilderMode } from '../contexts/builder-mode';
import type { BuilderContextProps } from '../contexts/builder-context-types';
import type { BuilderStore } from '../store/builder-store';

export interface UseContentLoaderArgs {
  store: BuilderStore;
  isWebBuilder: boolean;
}

export interface UseContentLoaderReturn {
  fetchContentAndVersion: BuilderContextProps['fetchContentAndVersion'];
  initContent: BuilderContextProps['initContent'];
}

// Encapsulates the Provider's content-loading lifecycle:
//   - fetchContent / fetchVersion: thin wrappers around the Apollo
//     lazy queries
//   - fetchContentAndVersion: composes the two + writes
//     currentContent / currentVersion / backupVersion into the store.
//     Uses setCurrentVersionFromServer so save round-trips don't
//     pollute the undo stack.
//   - initContent: top-level entry called once by the host on mount.
//     Seeds environmentId / projectId / envToken, drives the first
//     fetch, sets currentMode based on content type, clears history
//     (initial-load checkpoint), and handles the FLOW + initialStepIndex
//     "open directly to step N" deep-link case.
export const useContentLoader = (args: UseContentLoaderArgs): UseContentLoaderReturn => {
  const { store, isWebBuilder } = args;
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

  const fetchContentAndVersion = useCallback<BuilderContextProps['fetchContentAndVersion']>(
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

  const initContent = useCallback<BuilderContextProps['initContent']>(
    async (message) => {
      const { contentId, environmentId, envToken, versionId, projectId, initialStepIndex } =
        message;
      if (!environmentId || (!isWebBuilder && !envToken)) {
        return false;
      }

      const state = store.getState();
      state.setEnvToken(envToken);
      state.setIsLoading(true);
      state.setEnvironmentId(environmentId);
      state.setProjectId(projectId);
      const result = await fetchContentAndVersion(contentId, versionId);
      if (!result) {
        store.getState().setIsLoading(false);
        return false;
      }
      store.getState().setIsLoading(false);
      // Initial-load checkpoint: the freshly-fetched version is the
      // origin; nothing earlier is reachable via undo. (Save-induced
      // fetches don't clear history — those just refresh the baseline.)
      store.getState().clearHistory();

      const { content, version } = result;
      const versionType = content.type.toString();
      const versionMode = versionType as BuilderMode;
      const hasMode = Object.values(BuilderMode).includes(versionMode);

      // Handle initial step for flow type - directly open step editor
      if (
        versionType === ContentDataType.FLOW &&
        initialStepIndex !== undefined &&
        version.steps?.[initialStepIndex]
      ) {
        const step = version.steps[initialStepIndex];
        const cloned = JSON.parse(
          JSON.stringify({
            ...step,
            setting: { ...defaultStep.setting, ...step.setting },
          }),
        );
        const innerState = store.getState();
        innerState.setCurrentStep(cloned);
        innerState.setCurrentIndex(initialStepIndex);
        innerState.setCurrentMode({ mode: BuilderMode.FLOW_STEP_DETAIL });
        return true;
      }

      if (versionType !== ContentDataType.FLOW && hasMode) {
        store.getState().setCurrentMode({ mode: versionType as BuilderMode });
      } else {
        store.getState().setCurrentMode({ mode: BuilderMode.FLOW });
      }
      return true;
    },
    [fetchContentAndVersion, isWebBuilder, store],
  );

  return { fetchContentAndVersion, initContent };
};
