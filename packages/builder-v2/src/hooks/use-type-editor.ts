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

// CONFIG STABILITY: callers must pass a module-level config record,
// not an inline object. Inline configs would change identity every
// render and invalidate updateData's ref, which would cascade through
// any consumer useEffect / useMemo dep arrays (same class of bug as
// PR γ + arch fix). The recommended pattern is one config per
// content type, declared at module top:
//   const bannerTypeConfig: BuilderTypeConfig<BannerData> = { ... };
//   const editor = useTypeEditor(bannerTypeConfig);

export const useTypeEditor = <TData, TUIState = undefined>(
  config: BuilderTypeConfig<TData, TUIState>,
): UseTypeEditorReturn<TData, TUIState> => {
  const { isLoading } = useBuilderContext();
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
    // so we intentionally omit it from the dep array — same approach
    // as PR α's makeSetter helpers.
    // biome-ignore lint/correctness/useExhaustiveDependencies: stable config required
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
