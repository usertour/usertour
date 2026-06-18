import { useContext } from 'react';
import { useStore } from 'zustand';
import type { BuilderStoreState } from '@/pages/contents/components/builder/core/builder-store';
import { BuilderProviderContext } from '@/pages/contents/components/builder/core/builder-provider';

// Selector-based store access — the perf-friendly path. Use this for
// hot consumers that only need one or two store fields; it subscribes
// to just that selector slice rather than the whole state object.
export const useBuilderStore = <T>(selector: (state: BuilderStoreState) => T): T => {
  const ctx = useContext(BuilderProviderContext);
  if (!ctx) {
    throw new Error('useBuilderStore must be used within a BuilderProvider.');
  }
  return useStore(ctx.store, selector);
};

// Save FSM accessor — the save status (idle / dirty / saving / saved / error).
export const useSaveState = () => useBuilderStore((s) => s.saveState);

// Busy = a save in flight. The canonical "disable the form / show the footer
// spinner" predicate.
export const useIsBusy = () => useBuilderStore((s) => s.saveState.status === 'saving');
