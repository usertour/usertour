import type { Content, ContentVersion } from '@usertour/types';
import type { ReactNode } from 'react';
import type { BuilderStore } from '../store/builder-store';

// Imperative methods exposed by BuilderProvider. Signatures live here
// so both the Provider value shape and the per-concern provider hooks
// (use-content-loader / use-save-content / use-auto-save) reference
// the same type — keeps the call surface consistent across the four
// places it's mentioned.
//
// `setAutoSaveValidator` accepts null to clear a previously
// registered validator (per-type editor unmount); see use-auto-save.
export interface BuilderProviderMethods {
  initContent: (message: any) => Promise<boolean>;
  saveContent: () => Promise<void>;
  fetchContentAndVersion: (
    contentId: string,
    versionId: string,
  ) => Promise<false | { content: Content; version: ContentVersion }>;
  setAutoSaveValidator: (fn: ((version: ContentVersion) => boolean) | null) => void;
}

// Static config passed to BuilderProvider as props. Never changes
// after Provider mount; exposed via useBuilderConfig.
export interface BuilderProviderConfig {
  webHost: string;
  usertourjsUrl: string;
  onSaved: () => Promise<void>;
  shouldShowMadeWith: boolean;
  zIndex: number;
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
  webHost?: string;
  usertourjsUrl?: string;
  onSaved: () => Promise<void>;
  shouldShowMadeWith?: boolean;
}
