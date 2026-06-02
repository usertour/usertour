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

// The builder's full identity + static options, passed to BuilderProvider
// as props and exposed via useBuilderConfig. Never changes after mount.
//
// environmentId / projectId are the workspace; contentId / versionId are
// what's being edited. All are fixed props (not async-seeded into the draft
// store): env/project are read tree-wide via useEnvironmentId/useProjectId,
// content/version are consumed by useBuilderInit to hydrate the draft. The
// Provider therefore knows its complete "editing X@Y in workspace Z"
// identity in one place.
export interface BuilderProviderConfig {
  onSaved: () => Promise<void>;
  shouldShowMadeWith: boolean;
  zIndex: number;
  environmentId: string;
  projectId: string;
  contentId: string;
  versionId: string;
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
  contentId: string;
  versionId: string;
}
