import { defaultStep, getErrorMessage, isEqual } from '@usertour/helpers';
import { Content, ContentDataType, ContentVersion, Step, Theme } from '@usertour/types';
import { ReactNode, createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { useEvent } from 'react-use';

import { useToast } from '@usertour/ui';
import { debug } from '../utils/logger';
import { SelectorOutput } from '../utils/screenshot';
import { getEmptyDataForType } from '../utils/default-data';
import { duplicateStep, generateUniqueCopyName } from '@usertour/helpers';
import {
  useGetContentLazyQuery,
  useGetContentVersionLazyQuery,
  useAddContentStepsMutation,
  useAddContentStepMutation,
} from '@usertour/hooks';
import {
  type BuilderStore,
  type BuilderStoreState,
  createBuilderStore,
} from '../store/builder-store';
import { BuilderMode } from './builder-mode';
import type { CurrentMode } from './builder-mode';

// Re-export the mode enum + types so the public path
// `@usertour/builder-v2` (via contexts/index.tsx) keeps the same
// surface for the 114 existing useBuilderContext consumers.
export {
  BuilderMode,
  type BuilderSelectorMode,
  type BuilderTriggerMode,
  type BuilderCommonMode,
  type CurrentMode,
} from './builder-mode';

// The legacy public surface — what every `useBuilderContext()` caller
// destructures from. Preserved verbatim so the 114 consumers don't
// change in this commit.
interface BuilderContextProps {
  currentMode: CurrentMode;
  setCurrentMode: React.Dispatch<React.SetStateAction<CurrentMode>>;
  environmentId: string;
  setEnvironmentId: React.Dispatch<React.SetStateAction<string>>;
  envToken: string;
  saveContent: () => Promise<void>;
  initContent: (message: any) => Promise<boolean>;
  currentStep: Step | null;
  setCurrentStep: React.Dispatch<React.SetStateAction<Step | null>>;
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  selectorOutput?: SelectorOutput | null;
  setSelectorOutput: React.Dispatch<React.SetStateAction<SelectorOutput | null>>;
  position: string;
  setPosition: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  zIndex: number;
  currentLocation: string;
  projectId: string;
  setProjectId: React.Dispatch<React.SetStateAction<string>>;
  currentContent: Content | undefined;
  setCurrentContent: React.Dispatch<React.SetStateAction<Content | undefined>>;
  currentVersion: ContentVersion | undefined;
  setCurrentVersion: React.Dispatch<React.SetStateAction<ContentVersion | undefined>>;
  backupVersion: ContentVersion | undefined;
  setCurrentTheme: React.Dispatch<React.SetStateAction<Theme | undefined>>;
  currentTheme: Theme | undefined;
  updateCurrentStep: (fn: (pre: Step) => Step) => void;
  webHost: string;
  usertourjsUrl: string;
  isWebBuilder: boolean;
  onSaved: () => Promise<void>;
  isShowError: boolean;
  setIsShowError: React.Dispatch<React.SetStateAction<boolean>>;
  contentRef: React.MutableRefObject<HTMLDivElement | undefined>;
  fetchContentAndVersion: (
    contentId: string,
    versionId: string,
  ) => Promise<false | { content: Content; version: ContentVersion }>;
  createStep: (currentVersion: ContentVersion, step: Step) => Promise<Step | undefined>;
  createNewStep: (
    currentVersion: ContentVersion,
    sequence: number,
    stepType?: string,
    duplicateStep?: Step,
  ) => Promise<Step | undefined>;
  shouldShowMadeWith?: boolean;
}

// Carries the per-mount Zustand store + the imperative methods +
// the immutable config. `useBuilderContext()` merges all three into
// the legacy shape above; per-mount lookup is via React Context.
interface BuilderProviderContextValue {
  store: BuilderStore;
  methods: {
    initContent: BuilderContextProps['initContent'];
    saveContent: BuilderContextProps['saveContent'];
    updateCurrentStep: BuilderContextProps['updateCurrentStep'];
    fetchContentAndVersion: BuilderContextProps['fetchContentAndVersion'];
    createStep: BuilderContextProps['createStep'];
    createNewStep: BuilderContextProps['createNewStep'];
  };
  config: {
    webHost: string;
    usertourjsUrl: string;
    isWebBuilder: boolean;
    onSaved: () => Promise<void>;
    shouldShowMadeWith: boolean;
    zIndex: number;
  };
  contentRef: React.MutableRefObject<HTMLDivElement | undefined>;
}

const BuilderProviderContext = createContext<BuilderProviderContextValue | null>(null);

export interface BuilderProviderProps {
  children?: ReactNode;
  isWebBuilder?: boolean;
  webHost?: string;
  usertourjsUrl?: string;
  onSaved: () => Promise<void>;
  shouldShowMadeWith?: boolean;
}

export const BuilderProvider = (props: BuilderProviderProps) => {
  const {
    children,
    webHost = '',
    usertourjsUrl = '',
    isWebBuilder = false,
    onSaved,
    shouldShowMadeWith = true,
  } = props;

  // One store per mount — `useRef + if (!current)` is the standard
  // Zustand-with-Provider idiom (createBuilderStore would otherwise
  // run on every render and discard state).
  const storeRef = useRef<BuilderStore>();
  if (!storeRef.current) {
    storeRef.current = createBuilderStore();
  }
  const store = storeRef.current;
  const contentRef = useRef<HTMLDivElement | undefined>();
  const { toast } = useToast();

  const { invoke: getContent } = useGetContentLazyQuery();
  const { invoke: getContentVersion } = useGetContentVersionLazyQuery();
  const { invoke: addContentSteps } = useAddContentStepsMutation();
  const { invoke: addContentStep } = useAddContentStepMutation();

  const updateCurrentStep = useCallback(
    (fn: Step | ((pre: Step) => Step)) => {
      const setCurrentStep = store.getState().setCurrentStep;
      setCurrentStep((pre) => {
        if (typeof fn === 'function') {
          return pre ? fn(pre) : pre;
        }
        return fn;
      });
    },
    [store],
  );

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

  const fetchContentAndVersion = useCallback(
    async (contentId: string, versionId: string) => {
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
      state.setCurrentVersion(JSON.parse(JSON.stringify(version)));
      state.setBackupVersion(JSON.parse(JSON.stringify(version)));
      return { content, version };
    },
    [fetchContent, fetchVersion, store],
  );

  const initContent = useCallback(
    async (message: any) => {
      const {
        contentId,
        environmentId,
        envToken,
        url = '',
        versionId,
        projectId,
        initialStepIndex,
      } = message;
      if (!environmentId || (!isWebBuilder && !envToken)) {
        return false;
      }

      const state = store.getState();
      state.setEnvToken(envToken);
      state.setIsLoading(true);
      state.setCurrentLocation(url);
      state.setEnvironmentId(environmentId);
      state.setProjectId(projectId);
      const result = await fetchContentAndVersion(contentId, versionId);
      if (!result) {
        store.getState().setIsLoading(false);
        return false;
      }
      store.getState().setIsLoading(false);

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
        const _step = JSON.parse(
          JSON.stringify({
            ...step,
            setting: { ...defaultStep.setting, ...step.setting },
          }),
        );
        const innerState = store.getState();
        innerState.setCurrentStep(_step);
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

  const saveContent = useCallback(async () => {
    const { currentVersion, backupVersion } = store.getState();
    if (!currentVersion || !backupVersion || isEqual(currentVersion, backupVersion)) {
      return;
    }
    debug('saveContent:', currentVersion);
    if (!currentVersion || !currentVersion.id) {
      return;
    }
    store.getState().setIsLoading(true);
    const steps = currentVersion.steps
      ? currentVersion.steps.map(({ updatedAt, createdAt, cvid, ...step }, index) => ({
          ...step,
          sequence: index,
        }))
      : [];
    const variables = {
      contentId: currentVersion.contentId,
      versionId: currentVersion.id,
      themeId: currentVersion.themeId,
      steps,
    };
    try {
      const response = await addContentSteps(variables);
      if (response) {
        await fetchContentAndVersion(currentVersion.contentId, currentVersion.id);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
    store.getState().setIsLoading(false);
  }, [addContentSteps, fetchContentAndVersion, store, toast]);

  const createStep = useCallback(
    async (currentVersion: ContentVersion, step: Step) => {
      try {
        const createdStep = await addContentStep({ ...step, versionId: currentVersion.id });
        if (createdStep) {
          await fetchContentAndVersion(currentVersion.contentId, currentVersion.id);
          return createdStep as Step;
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: getErrorMessage(error),
        });
      }
    },
    [addContentStep, fetchContentAndVersion, toast],
  );

  const createNewStep = useCallback(
    async (
      currentVersion: ContentVersion,
      sequence: number,
      stepType?: string,
      stepToDuplicate?: Step,
    ) => {
      const finalStepType = stepType || stepToDuplicate?.type || 'tooltip';
      const existingStepNames = currentVersion?.steps?.map((step) => step.name) ?? [];

      let step: Step;
      if (stepToDuplicate) {
        // Duplicate step within the same flow - need new cvid
        const duplicated = duplicateStep(stepToDuplicate);
        step = {
          ...duplicated,
          cvid: undefined, // Remove cvid to generate new one within the same flow
          name: generateUniqueCopyName(stepToDuplicate.name, existingStepNames),
          sequence,
        } as Step;
      } else {
        step = {
          ...defaultStep,
          type: finalStepType,
          name: 'Untitled',
          data: getEmptyDataForType(),
          sequence,
          setting: {
            ...defaultStep.setting,
            // width is undefined by default (Auto - uses theme default)
          },
        };
      }

      return await createStep(currentVersion, step);
    },
    [createStep],
  );

  // Auto-save: trip on currentVersion / backupVersion diff. Reads
  // straight from the store so the effect re-fires when either slice
  // changes (subscribe → set local trigger ref → effect re-runs).
  const currentVersion = useStore(store, (s) => s.currentVersion);
  const backupVersion = useStore(store, (s) => s.backupVersion);
  useEffect(() => {
    if (currentVersion && backupVersion && !isEqual(currentVersion, backupVersion)) {
      void saveContent();
    }
  }, [currentVersion, backupVersion, saveContent]);

  // Warn user when closing page while saving — same beforeunload guard
  // as V1; reads `isLoading` from store via subscription.
  const isLoading = useStore(store, (s) => s.isLoading);
  useEvent('beforeunload', (e: BeforeUnloadEvent) => {
    if (isLoading) {
      e.preventDefault();
    }
  });

  const providerValue = useRef<BuilderProviderContextValue>();
  // Refresh the value object on each render so closure-captured methods
  // see fresh hook returns (useGetContent etc. rebind when Apollo state
  // changes). Cheap — 114 consumers re-render anyway because they
  // currently destructure the whole context.
  providerValue.current = {
    store,
    methods: {
      initContent,
      saveContent,
      updateCurrentStep,
      fetchContentAndVersion,
      createStep,
      createNewStep,
    },
    config: {
      webHost,
      usertourjsUrl,
      isWebBuilder,
      onSaved,
      shouldShowMadeWith,
      zIndex: 0,
    },
    contentRef,
  };

  return (
    <BuilderProviderContext.Provider value={providerValue.current}>
      {children}
    </BuilderProviderContext.Provider>
  );
};

// Direct store access — for future selector-based subscription
// migration (perf optimization). Not used by existing consumers.
export const useBuilderStore = <T,>(selector: (state: BuilderStoreState) => T): T => {
  const ctx = useContext(BuilderProviderContext);
  if (!ctx) {
    throw new Error('useBuilderStore must be used within a BuilderProvider.');
  }
  return useStore(ctx.store, selector);
};

// Legacy adapter — returns the full context shape that V1 consumers
// destructure from. Subscribes to the whole store state so consumers
// re-render on any state change (same behavior as the old Context
// value). Migrating hot consumers to `useBuilderStore(selector)` is a
// follow-up commit.
export function useBuilderContext(): BuilderContextProps {
  const ctx = useContext(BuilderProviderContext);
  if (!ctx) {
    throw new Error('useBuilderContext must be used within a BuilderProvider.');
  }
  const state = useStore(ctx.store, (s) => s);
  return {
    currentMode: state.currentMode,
    setCurrentMode: state.setCurrentMode,
    environmentId: state.environmentId,
    setEnvironmentId: state.setEnvironmentId,
    envToken: state.envToken,
    currentStep: state.currentStep,
    setCurrentStep: state.setCurrentStep,
    currentIndex: state.currentIndex,
    setCurrentIndex: state.setCurrentIndex,
    selectorOutput: state.selectorOutput,
    setSelectorOutput: state.setSelectorOutput,
    position: state.position,
    setPosition: state.setPosition,
    isLoading: state.isLoading,
    setIsLoading: state.setIsLoading,
    currentLocation: state.currentLocation,
    projectId: state.projectId,
    setProjectId: state.setProjectId,
    currentContent: state.currentContent,
    setCurrentContent: state.setCurrentContent,
    currentVersion: state.currentVersion,
    setCurrentVersion: state.setCurrentVersion,
    backupVersion: state.backupVersion,
    currentTheme: state.currentTheme,
    setCurrentTheme: state.setCurrentTheme,
    isShowError: state.isShowError,
    setIsShowError: state.setIsShowError,
    saveContent: ctx.methods.saveContent,
    initContent: ctx.methods.initContent,
    updateCurrentStep: ctx.methods.updateCurrentStep,
    fetchContentAndVersion: ctx.methods.fetchContentAndVersion,
    createStep: ctx.methods.createStep,
    createNewStep: ctx.methods.createNewStep,
    webHost: ctx.config.webHost,
    usertourjsUrl: ctx.config.usertourjsUrl,
    isWebBuilder: ctx.config.isWebBuilder,
    onSaved: ctx.config.onSaved,
    shouldShowMadeWith: ctx.config.shouldShowMadeWith,
    zIndex: ctx.config.zIndex,
    contentRef: ctx.contentRef,
  };
}
