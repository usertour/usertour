import { defaultStep, getErrorMessage, isEqual } from '@usertour/helpers';
import { Content, ContentDataType, ContentVersion, Step, Theme } from '@usertour/types';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
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
  useUpdateContentVersionMutation,
} from '@usertour/hooks';
import {
  type BuilderStore,
  type BuilderStoreState,
  createBuilderStore,
} from '../store/builder-store';
import { BuilderLeaveGuard } from '../shell/builder-leave-guard';
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
  // Per-type editors register a validator; the auto-save useEffect
  // consults it before triggering saveContent for data-dirty edits.
  // Returns false → skip THIS auto-save cycle (saveState stays
  // 'dirty'; explicit saveContent() calls still go through). Used
  // by Launcher to avoid persisting incomplete action chips while
  // the user is mid-edit. Pass null to clear. Originally Phase 1
  // ADR's "validation gates on auto-save" item; landed in PR κ.
  setAutoSaveValidator: (fn: ((version: ContentVersion) => boolean) | null) => void;
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
    setAutoSaveValidator: BuilderContextProps['setAutoSaveValidator'];
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
  const { invoke: updateContentVersion } = useUpdateContentVersionMutation();

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

  // Monotonic counter for in-flight save identity. When a newer save
  // is dispatched while an older one is still awaiting its response,
  // the older response is ignored on commit — the server is
  // idempotent on the (contentId, versionId, steps) payload so
  // letting both requests complete is fine; only the latest result
  // is honored. Per-Provider-mount (useRef preserves across renders).
  const saveCounterRef = useRef(0);

  const saveContent = useCallback(async () => {
    const { currentVersion, backupVersion } = store.getState();
    if (!currentVersion || !backupVersion || isEqual(currentVersion, backupVersion)) {
      return;
    }
    debug('saveContent:', currentVersion);
    if (!currentVersion.id) {
      return;
    }

    // Dispatcher: pick which mutation(s) to dispatch based on what's
    // dirty. `addContentSteps` writes steps + themeId; `updateContentVersion`
    // writes the per-type data blob. PR γ tracked only the steps path;
    // PR ζ extends to the data path so per-type editors can drop their
    // own save loops and route through this FSM via setCurrentVersion.
    // Both mutations are server-side idempotent on (versionId, payload),
    // so the per-save identity check (saveCounterRef) still applies if
    // both fire in parallel for a single in-flight save.
    const stepsDirty =
      !isEqual(currentVersion.steps, backupVersion.steps) ||
      currentVersion.themeId !== backupVersion.themeId;
    const dataDirty = !isEqual(currentVersion.data, backupVersion.data);
    if (!stepsDirty && !dataDirty) {
      return;
    }

    const saveId = ++saveCounterRef.current;
    store.getState().transitionSaveState({ status: 'saving', saveId });

    const pending: Array<Promise<unknown>> = [];
    if (stepsDirty) {
      const steps = currentVersion.steps
        ? currentVersion.steps.map(({ updatedAt, createdAt, cvid, ...step }, index) => ({
            ...step,
            sequence: index,
          }))
        : [];
      pending.push(
        addContentSteps({
          contentId: currentVersion.contentId,
          versionId: currentVersion.id,
          themeId: currentVersion.themeId,
          steps,
        }),
      );
    }
    if (dataDirty) {
      pending.push(updateContentVersion(currentVersion.id, { data: currentVersion.data }));
    }

    try {
      const responses = await Promise.all(pending);
      // Identity check: a newer save has started while this one was in
      // flight — discard our response. The newer save will drive the
      // final saveState transition.
      if (saveId !== saveCounterRef.current) {
        return;
      }
      // Treat the save as successful if every dispatched mutation
      // resolved truthy (addContentSteps + updateContentVersion both
      // return data objects on success; nullish means the wrapper hook
      // swallowed an error without throwing).
      const allOk = responses.every((r) => Boolean(r));
      if (allOk) {
        await fetchContentAndVersion(currentVersion.contentId, currentVersion.id);
        if (saveId === saveCounterRef.current) {
          store.getState().transitionSaveState({ status: 'saved', savedAt: Date.now() });
        }
      }
    } catch (error) {
      if (saveId !== saveCounterRef.current) {
        return;
      }
      const err = error instanceof Error ? error : new Error(getErrorMessage(error));
      store.getState().transitionSaveState({ status: 'error', error: err });
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  }, [addContentSteps, updateContentVersion, fetchContentAndVersion, store, toast]);

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

  // Per-type auto-save validator. Per-type editors call
  // setAutoSaveValidator on mount to register a predicate, clear it
  // (pass null) on unmount. The auto-save useEffect consults it; a
  // veto skips THIS auto-save cycle but keeps saveState = 'dirty', so
  // the user can still explicitly Save (which bypasses) and the leave
  // guard (PR ε) still prompts on navigation. See Launcher migration
  // (PR κ) for the canonical use: skip persisting partial action chips
  // while the user is still filling them out.
  const autoSaveValidatorRef = useRef<((version: ContentVersion) => boolean) | null>(null);
  const setAutoSaveValidator = useCallback((fn: ((version: ContentVersion) => boolean) | null) => {
    autoSaveValidatorRef.current = fn;
  }, []);

  // Ref-stable wrappers for every imperative method exposed via
  // useBuilderContext. Each underlying useCallback's deps include
  // Apollo hook return refs (useAddContentStepsMutation,
  // useGetContentLazyQuery, etc.) that are not ref-stable across
  // renders — so the useCallbacks themselves don't memoize, and any
  // consumer that lists one of them in a useEffect / useMemo dep
  // array would re-fire every render. With state changes (e.g. step
  // delete makes currentVersion != backupVersion), the re-fire
  // compounds into an infinite render loop (observed in
  // FlowBuilderTrigger / ConditionWait / SidebarTheme / ScrollArea
  // depending on which consumer triggered first). Wrap each method
  // in a useRef + useMemo-of-`[]` thunk so the exposed identity is
  // pinned at first render while still dispatching to the latest
  // closure on every call.
  const methodsRef = useRef({
    updateCurrentStep,
    fetchContentAndVersion,
    initContent,
    saveContent,
    createStep,
    createNewStep,
    setAutoSaveValidator,
  });
  methodsRef.current = {
    updateCurrentStep,
    fetchContentAndVersion,
    initContent,
    saveContent,
    createStep,
    createNewStep,
    setAutoSaveValidator,
  };
  const stableMethods = useMemo<BuilderProviderContextValue['methods']>(
    () => ({
      updateCurrentStep: (fn) => methodsRef.current.updateCurrentStep(fn),
      fetchContentAndVersion: (cid, vid) => methodsRef.current.fetchContentAndVersion(cid, vid),
      initContent: (msg) => methodsRef.current.initContent(msg),
      saveContent: () => methodsRef.current.saveContent(),
      createStep: (cv, step) => methodsRef.current.createStep(cv, step),
      createNewStep: (cv, seq, type, dup) => methodsRef.current.createNewStep(cv, seq, type, dup),
      setAutoSaveValidator: (fn) => methodsRef.current.setAutoSaveValidator(fn),
    }),
    [],
  );

  // Auto-save driver: subscribe to currentVersion + backupVersion
  // diff. On dirty → transition saveState to 'dirty' and trigger a
  // save (race-safe via saveCounterRef identity check inside
  // saveContent). On clean (after server round-trip resets
  // backupVersion = currentVersion) → settle saveState back to
  // 'saved' if it was 'saving', otherwise leave error/idle alone.
  // Uses stableMethods.saveContent so the effect's deps don't bounce.
  const currentVersion = useStore(store, (s) => s.currentVersion);
  const backupVersion = useStore(store, (s) => s.backupVersion);
  useEffect(() => {
    if (!currentVersion || !backupVersion) {
      return;
    }
    if (!isEqual(currentVersion, backupVersion)) {
      store
        .getState()
        .transitionSaveState((prev) =>
          prev.status === 'dirty' || prev.status === 'saving' ? prev : { status: 'dirty' },
        );
      // Per-type validator veto (PR κ): keep saveState dirty but skip
      // this auto-save cycle. Explicit Save (saveContent called from
      // a button) bypasses this — it goes straight to saveContent,
      // not through this useEffect.
      const validator = autoSaveValidatorRef.current;
      if (validator && !validator(currentVersion)) {
        return;
      }
      void stableMethods.saveContent();
    }
  }, [currentVersion, backupVersion, store, stableMethods]);

  // beforeunload guard: warn on either "still loading content" (isLoading)
  // or "save in flight / dirty buffer" (saveState). V1 only checked
  // isLoading; PR γ broadens it so the user is also warned about
  // unsaved local edits that haven't reached the server yet.
  const isLoading = useStore(store, (s) => s.isLoading);
  const saveState = useStore(store, (s) => s.saveState);
  useEvent('beforeunload', (e: BeforeUnloadEvent) => {
    const saveInFlight = saveState.status === 'saving' || saveState.status === 'dirty';
    if (isLoading || saveInFlight) {
      e.preventDefault();
    }
  });

  // Builder-level undo / redo keyboard shortcuts. Skipped when an
  // editable element is focused — text inputs / contenteditable areas
  // have their own native undo for the text they manage, and hijacking
  // Cmd+Z there would interfere with intra-field editing. The
  // ContentEditor inside rich-text step content runs its own undo
  // inside the contenteditable; this binding only catches Cmd+Z when
  // focus is on chrome (sidebar buttons, canvas, body).
  useEvent('keydown', (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) {
      return;
    }
    const active = document.activeElement;
    const inEditable =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (active instanceof HTMLElement && active.isContentEditable);
    if (inEditable) {
      return;
    }
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      store.getState().undo();
    } else if ((key === 'z' && e.shiftKey) || key === 'y') {
      e.preventDefault();
      store.getState().redo();
    }
  });

  // Provider value is memoized on stableMethods + config so its
  // identity is pinned for the Provider mount lifetime. Each method
  // dispatches to the latest closure via methodsRef; the wrapper
  // refs themselves never change, so consumer useEffect / useMemo
  // dep arrays that list these methods stay stable across renders.
  const providerValue = useMemo<BuilderProviderContextValue>(
    () => ({
      store,
      methods: stableMethods,
      config: {
        webHost,
        usertourjsUrl,
        isWebBuilder,
        onSaved,
        shouldShowMadeWith,
        zIndex: 0,
      },
      contentRef,
    }),
    [store, stableMethods, webHost, usertourjsUrl, isWebBuilder, onSaved, shouldShowMadeWith],
  );

  return (
    <BuilderProviderContext.Provider value={providerValue}>
      <BuilderLeaveGuard />
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

// Save FSM accessor — for components that want richer save-status UI
// (saved-Xs-ago label, error retry button, etc.) than the overloaded
// boolean `isLoading` exposes. Not yet wired in any consumer; the
// migration of SidebarFooter to use this is a follow-up commit.
export const useSaveState = () => useBuilderStore((s) => s.saveState);

// Undo / redo affordances — for UI buttons on top of the Cmd+Z /
// Cmd+Shift+Z / Cmd+Y keyboard shortcuts wired at the Provider level.
// canUndo / canRedo are reactive selectors; undo / redo are stable
// store method refs (safe to bind directly to a button onClick).
export const useCanUndo = () => useBuilderStore((s) => s.history.past.length > 0);
export const useCanRedo = () => useBuilderStore((s) => s.history.future.length > 0);
export const useUndo = () => useBuilderStore((s) => s.undo);
export const useRedo = () => useBuilderStore((s) => s.redo);

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
    // Derived: V1's `isLoading` was overloaded (loading content OR
    // saving). PR γ pulled saving into saveState; merge them back
    // here so legacy consumers (SidebarFooter spinner, form disable)
    // still see `isLoading: true` while a save is in flight.
    isLoading: state.isLoading || state.saveState.status === 'saving',
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
    setAutoSaveValidator: ctx.methods.setAutoSaveValidator,
    webHost: ctx.config.webHost,
    usertourjsUrl: ctx.config.usertourjsUrl,
    isWebBuilder: ctx.config.isWebBuilder,
    onSaved: ctx.config.onSaved,
    shouldShowMadeWith: ctx.config.shouldShowMadeWith,
    zIndex: ctx.config.zIndex,
    contentRef: ctx.contentRef,
  };
}
