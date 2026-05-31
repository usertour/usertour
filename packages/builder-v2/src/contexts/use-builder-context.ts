import { useContext } from 'react';
import { useStore } from 'zustand';
import type { BuilderContextProps } from './builder-context-types';
import { BuilderProviderContext } from './builder-provider';

/**
 * @deprecated Subscribes to the whole store, so every consumer
 * re-renders on any state change. Migrate to one of:
 *   - `useBuilderStore(s => s.X)` for state fields
 *   - `useBuilderMethods()` for imperative methods (saveContent /
 *     initContent / fetchContentAndVersion / setAutoSaveValidator)
 *   - `useBuilderConfig()` for static config (zIndex / isWebBuilder /
 *     webHost / usertourjsUrl / onSaved / shouldShowMadeWith)
 *   - `useBuilderContentRef()` for the Provider-owned content <div> ref
 *
 * See docs/conventions/builder-context-migration.md for the per-field
 * mapping and the page-by-page migration order.
 */
export const useBuilderContext = (): BuilderContextProps => {
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
    // Flow cursors — exposed read-only; writes go through useFlowEditor().
    currentStep: state.currentStep,
    currentIndex: state.currentIndex,
    isShowError: state.isShowError,
    selectorOutput: state.selectorOutput,
    setSelectorOutput: state.setSelectorOutput,
    position: state.position,
    setPosition: state.setPosition,
    // Derived: the legacy `isLoading` was overloaded (loading content
    // OR saving). PR γ pulled saving into saveState; merge them back
    // here so legacy consumers (SidebarFooter spinner, form disable)
    // still see `isLoading: true` while a save is in flight.
    isLoading: state.isLoading || state.saveState.status === 'saving',
    setIsLoading: state.setIsLoading,
    projectId: state.projectId,
    setProjectId: state.setProjectId,
    currentContent: state.currentContent,
    setCurrentContent: state.setCurrentContent,
    currentVersion: state.currentVersion,
    setCurrentVersion: state.setCurrentVersion,
    backupVersion: state.backupVersion,
    currentTheme: state.currentTheme,
    setCurrentTheme: state.setCurrentTheme,
    saveContent: ctx.methods.saveContent,
    initContent: ctx.methods.initContent,
    fetchContentAndVersion: ctx.methods.fetchContentAndVersion,
    setAutoSaveValidator: ctx.methods.setAutoSaveValidator,
    webHost: ctx.config.webHost,
    usertourjsUrl: ctx.config.usertourjsUrl,
    isWebBuilder: ctx.config.isWebBuilder,
    onSaved: ctx.config.onSaved,
    shouldShowMadeWith: ctx.config.shouldShowMadeWith,
    zIndex: ctx.config.zIndex,
    contentRef: ctx.contentRef,
  };
};
