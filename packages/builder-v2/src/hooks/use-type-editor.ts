import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { useBuilderContext, useBuilderStore } from '../contexts/builder-context';
import type { BuilderTypeConfig } from '../types/builder-type-config';

// Ties a BuilderTypeConfig into the Zustand store + Save FSM. Per-type
// editors call this instead of running their own debounced save loop.
//
// data       — current per-type data, normalized; undefined until
//              currentVersion has loaded.
// updateData — mutates `currentVersion.data` via setCurrentVersion,
//              which (a) pushes patches onto the undo stack (PR δ)
//              and (b) trips the FSM dispatcher (PR ζ) to fire
//              updateContentVersion server-side.
// uiState    — per-type UI cursor / buffer; pure local useState,
//              not persisted.
// isLoading  — derived from useBuilderContext (PR γ already merges
//              save-in-flight into isLoading for legacy consumers).

export interface UseTypeEditorReturn<TData, TUIState> {
  data: TData | undefined;
  updateData: (updates: Partial<TData>) => void;
  uiState: TUIState;
  setUIState: Dispatch<SetStateAction<TUIState>>;
  isLoading: boolean;
}

export const useTypeEditor = <TData, TUIState = undefined>(
  config: BuilderTypeConfig<TData, TUIState>,
): UseTypeEditorReturn<TData, TUIState> => {
  const { isLoading } = useBuilderContext();
  const rawData = useBuilderStore((state) => state.currentVersion?.data) as TData | undefined;
  const setCurrentVersion = useBuilderStore((state) => state.setCurrentVersion);
  const normalize =
    config.normalize ??
    ((value: TData | undefined): TData => (value ?? config.defaultData) as TData);
  const data = rawData !== undefined ? normalize(rawData) : undefined;

  const updateData = useCallback(
    (updates: Partial<TData>) => {
      setCurrentVersion((prev) => {
        if (!prev) {
          return prev;
        }
        const currentData = (prev.data as TData | undefined) ?? config.defaultData;
        return {
          ...prev,
          data: { ...currentData, ...updates },
        };
      });
    },
    [setCurrentVersion, config.defaultData],
  );

  // Per-type UI state is local — lives per-type-mount, dies on
  // unmount. If a config didn't supply defaultUIState the slot is
  // effectively unused; we still useState (with undefined) to keep
  // the hook shape stable across configs with / without UI state.
  const [uiState, setUIState] = useState<TUIState>(
    (config.defaultUIState ?? (undefined as unknown as TUIState)) as TUIState,
  );

  return { data, updateData, uiState, setUIState, isLoading };
};
