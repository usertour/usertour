import type { Content, ContentVersion, Step, Theme } from '@usertour/types';
import type { ReactNode } from 'react';
import type { BuilderStore } from '../store/builder-store';
import type { SelectorOutput } from '../utils/screenshot';
import type { CurrentMode } from './builder-mode';

// The public surface every `useBuilderContext()` caller destructures
// from. Cross-type fields and cross-type imperative methods live here.
//
// Flow-only cursors (`currentStep`, `currentIndex`, `isShowError`) are
// exposed read-only — they're consumed by cross-type hooks
// (use-current-theme for step.themeId inheritance, use-content-position
// for step.setting.position, etc.) and by app/index.tsx's URL mirror.
// Writes go through `useFlowEditor()`, not through this hook.
export interface BuilderContextProps {
  currentMode: CurrentMode;
  setCurrentMode: React.Dispatch<React.SetStateAction<CurrentMode>>;
  environmentId: string;
  setEnvironmentId: React.Dispatch<React.SetStateAction<string>>;
  envToken: string;
  saveContent: () => Promise<void>;
  initContent: (message: any) => Promise<boolean>;
  // Flow-only cursors — read-only on the public surface.
  currentStep: Step | null;
  currentIndex: number;
  isShowError: boolean;
  selectorOutput?: SelectorOutput | null;
  setSelectorOutput: React.Dispatch<React.SetStateAction<SelectorOutput | null>>;
  position: string;
  setPosition: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  zIndex: number;
  projectId: string;
  setProjectId: React.Dispatch<React.SetStateAction<string>>;
  currentContent: Content | undefined;
  setCurrentContent: React.Dispatch<React.SetStateAction<Content | undefined>>;
  currentVersion: ContentVersion | undefined;
  setCurrentVersion: React.Dispatch<React.SetStateAction<ContentVersion | undefined>>;
  backupVersion: ContentVersion | undefined;
  setCurrentTheme: React.Dispatch<React.SetStateAction<Theme | undefined>>;
  currentTheme: Theme | undefined;
  webHost: string;
  usertourjsUrl: string;
  isWebBuilder: boolean;
  onSaved: () => Promise<void>;
  contentRef: React.MutableRefObject<HTMLDivElement | undefined>;
  fetchContentAndVersion: (
    contentId: string,
    versionId: string,
  ) => Promise<false | { content: Content; version: ContentVersion }>;
  shouldShowMadeWith?: boolean;
  // Per-type editors register a validator; the auto-save useEffect
  // consults it before triggering saveContent for data-dirty edits.
  // Returns false → skip THIS auto-save cycle (saveState stays
  // 'dirty'; explicit saveContent() calls still go through). Used
  // by Launcher to avoid persisting incomplete action chips while
  // the user is mid-edit. Pass null to clear.
  setAutoSaveValidator: (fn: ((version: ContentVersion) => boolean) | null) => void;
}

// Carries the per-mount Zustand store + the imperative methods +
// the immutable config. `useBuilderContext()` merges all three into
// the legacy shape above; per-mount lookup is via React Context.
export interface BuilderProviderContextValue {
  store: BuilderStore;
  methods: {
    initContent: BuilderContextProps['initContent'];
    saveContent: BuilderContextProps['saveContent'];
    fetchContentAndVersion: BuilderContextProps['fetchContentAndVersion'];
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

export interface BuilderProviderProps {
  children?: ReactNode;
  isWebBuilder?: boolean;
  webHost?: string;
  usertourjsUrl?: string;
  onSaved: () => Promise<void>;
  shouldShowMadeWith?: boolean;
}
