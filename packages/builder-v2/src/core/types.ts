import type { Content, ContentVersion } from '@usertour/types';
import type { ReactNode } from 'react';
import type { BuilderStore } from './builder-store';

// Imperative methods exposed by BuilderProvider. Signatures live here
// so both the Provider value shape and the per-concern provider hooks
// (use-content-loader / use-save-content / use-auto-save) reference
// the same type — keeps the call surface consistent across the four
// places it's mentioned.
//
// `setAutoSaveValidator` accepts null to clear a previously
// registered validator (per-type editor unmount); see use-auto-save.
export interface BuilderProviderMethods {
  saveContent: () => Promise<void>;
  fetchContentAndVersion: (
    contentId: string,
    versionId: string,
  ) => Promise<{ content: Content; version: ContentVersion } | null>;
  setAutoSaveValidator: (fn: ((version: ContentVersion) => boolean) | null) => void;
}

// Static config passed to BuilderProvider as props. Never changes
// after Provider mount; exposed via useBuilderConfig.
//
// environmentId / projectId are the workspace identity. They're fixed
// props (not async-seeded into the draft store), so they live here as
// immutable config and the data hooks read them via
// useEnvironmentId / useProjectId.
export interface BuilderProviderConfig {
  onSaved: () => Promise<void>;
  shouldShowMadeWith: boolean;
  zIndex: number;
  environmentId: string;
  projectId: string;
}

// Carries the per-mount Zustand store + the imperative methods +
// the immutable config. Consumers read each via the dedicated hooks:
//   - useBuilderStore(selector)  → store fields (subscribes)
//   - useBuilderMethods()        → methods (mount-stable)
//   - useBuilderConfig()         → config (mount-stable)
//   - useBuilderContentRef()     → contentRef (useRef-stable)
export interface BuilderProviderContextValue {
  store: BuilderStore;
  methods: BuilderProviderMethods;
  config: BuilderProviderConfig;
  contentRef: React.MutableRefObject<HTMLDivElement | undefined>;
}

export interface BuilderProviderProps {
  children?: ReactNode;
  onSaved: () => Promise<void>;
  shouldShowMadeWith?: boolean;
  environmentId: string;
  projectId: string;
}
