import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { useBuilderStore, useIsBusy } from '../core';
import type { BuilderTypeConfig } from '../core/builder-type-config';

// Editor abstraction for the four data-blob content types — Banner,
// Checklist, Launcher, ResourceCenter. They each edit
// `currentVersion.data` (a JSON blob) via partial-merge updates and
// share the same save lifecycle, so a single hook fits all four.
//
// Flow does NOT use this hook. Flow edits `currentVersion.steps[]`
// (a top-level sibling array, not a sub-field of `data`) with list
// operations (add/remove/reorder) instead of partial merge, plus a
// dedicated `currentStep` local buffer for sub-mode editing. Those
// requirements don't fit useTypeEditor's contract, so Flow has its
// own `useFlowEditor` hook at builders/flow/use-flow-editor.ts. The two
// hooks share the Provider's save FSM (both write via
// `setCurrentVersion`) but diverge on data shape and mutation pattern.
//
// data       — current per-type data, normalized; undefined until
//              currentVersion has loaded.
// updateData — mutates `currentVersion.data` via setCurrentVersion,
//              which (a) pushes patches onto the undo stack and
//              (b) trips the FSM dispatcher to fire
//              updateContentVersion server-side.
// uiState    — per-type UI cursor / buffer; pure local useState,
//              not persisted.
// isLoading  — merges initial-content load + save-in-flight, mirroring
//              the legacy isLoading overload that per-type save
//              buttons / form-disable bindings rely on.

export interface UseTypeEditorReturn<TData, TUIState> {
  data: TData | undefined;
  updateData: (updates: Partial<TData>) => void;
  uiState: TUIState;
  setUIState: Dispatch<SetStateAction<TUIState>>;
  isLoading: boolean;
}

// CONFIG STABILITY: callers must pass a module-level config record,
// not an inline object. Inline configs would change identity every
// render and invalidate updateData's ref, which would cascade through
// any consumer useEffect / useMemo dep arrays. The recommended
// pattern is one config per content type, declared at module top:
//   const bannerTypeConfig: BuilderTypeConfig<BannerData> = { ... };
//   const editor = useTypeEditor(bannerTypeConfig);

export const useTypeEditor = <TData, TUIState = undefined>(
  config: BuilderTypeConfig<TData, TUIState>,
): UseTypeEditorReturn<TData, TUIState> => {
  const isLoading = useIsBusy();
  const rawData = useBuilderStore((state) => state.currentVersion?.data) as TData | undefined;
  const setCurrentVersion = useBuilderStore((state) => state.setCurrentVersion);

  const normalizeData = (value: TData | undefined): TData =>
    config.normalize ? config.normalize(value) : ((value ?? config.defaultData) as TData);
  const data = rawData !== undefined ? normalizeData(rawData) : undefined;

  // updateData spreads NORMALIZED prev data (not raw) so the first
  // edit also commits any default-merging done by normalize. V1's
  // BannerContext used to do this via a seeding useEffect that
  // pushed the normalized server data into localState + the
  // lastSavedDataRef on mount; here we fold that into the writer
  // so the abstraction is read-time normalization + write-time
  // materialization, no separate seeding effect.
  const updateData = useCallback(
    (updates: Partial<TData>) => {
      setCurrentVersion((prev) => {
        if (!prev) {
          return prev;
        }
        const normalized = normalizeData(prev.data as TData | undefined);
        return {
          ...prev,
          data: { ...normalized, ...updates },
        };
      });
    },
    // Config is required to be stable (see CONFIG STABILITY comment),
    // so it's intentionally omitted from the dep array.
    [setCurrentVersion],
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
