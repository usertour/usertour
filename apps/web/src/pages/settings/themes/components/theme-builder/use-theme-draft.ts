import { cuid } from '@usertour/helpers';
import {
  type RulesCondition,
  type ThemeTypesSetting,
  type ThemeVariation,
  defaultSettings,
} from '@usertour/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cloneDeep, getPath, setPath } from './draft-util';

export interface UseThemeDraftArgs {
  initialBase: ThemeTypesSetting;
  initialVariations: ThemeVariation[];
  activeVariationId: string | null;
}

export interface UseThemeDraftResult {
  base: ThemeTypesSetting;
  variations: ThemeVariation[];
  activeSettings: ThemeTypesSetting;
  activeVariation: ThemeVariation | null;
  setField: (path: string, value: unknown) => void;
  getField: <T = unknown>(path: string) => T | undefined;
  addVariation: (name?: string) => string;
  removeVariation: (id: string) => void;
  renameVariation: (id: string, name: string) => void;
  updateVariationConditions: (id: string, conditions: RulesCondition[]) => void;
  reset: () => void;
  markSaved: () => void;
  hasUnsavedChanges: boolean;
}

interface Snapshot {
  base: ThemeTypesSetting;
  variations: ThemeVariation[];
}

const cloneSnapshot = (s: Snapshot): Snapshot => ({
  base: cloneDeep(s.base),
  variations: cloneDeep(s.variations),
});

export function useThemeDraft({
  initialBase,
  initialVariations,
  activeVariationId,
}: UseThemeDraftArgs): UseThemeDraftResult {
  const initial: Snapshot = useMemo(
    () => ({ base: initialBase, variations: initialVariations }),
    [initialBase, initialVariations],
  );

  const [base, setBase] = useState<ThemeTypesSetting>(() => cloneDeep(initialBase));
  const [variations, setVariations] = useState<ThemeVariation[]>(() =>
    cloneDeep(initialVariations),
  );
  const [baseline, setBaseline] = useState<Snapshot>(() => cloneSnapshot(initial));

  // Reset drafts when the upstream theme reference changes (refetch / theme switch).
  const initialRef = useRef(initial);
  useEffect(() => {
    if (initialRef.current !== initial) {
      initialRef.current = initial;
      setBase(cloneDeep(initial.base));
      setVariations(cloneDeep(initial.variations));
      setBaseline(cloneSnapshot(initial));
    }
  }, [initial]);

  const activeVariation = useMemo(
    () => (activeVariationId ? (variations.find((v) => v.id === activeVariationId) ?? null) : null),
    [activeVariationId, variations],
  );

  const activeSettings = activeVariation ? activeVariation.settings : base;

  const setField = useCallback(
    (path: string, value: unknown) => {
      if (activeVariationId === null) {
        setBase(
          (prev) =>
            setPath(
              prev as unknown as Record<string, unknown>,
              path,
              value,
            ) as unknown as ThemeTypesSetting,
        );
      } else {
        setVariations((prev) =>
          prev.map((v) =>
            v.id === activeVariationId
              ? {
                  ...v,
                  settings: setPath(
                    v.settings as unknown as Record<string, unknown>,
                    path,
                    value,
                  ) as unknown as ThemeTypesSetting,
                }
              : v,
          ),
        );
      }
    },
    [activeVariationId],
  );

  const getField = useCallback(
    <T>(path: string): T | undefined => getPath(activeSettings, path) as T | undefined,
    [activeSettings],
  );

  const addVariation = useCallback((name?: string): string => {
    const id = cuid();
    const next: ThemeVariation = {
      id,
      name: name ?? '',
      conditions: [],
      settings: cloneDeep(defaultSettings),
    };
    setVariations((prev) => {
      const fallbackName = name ?? `Variation ${prev.length + 1}`;
      return [...prev, { ...next, name: next.name || fallbackName }];
    });
    return id;
  }, []);

  const removeVariation = useCallback((id: string) => {
    setVariations((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const renameVariation = useCallback((id: string, name: string) => {
    setVariations((prev) => prev.map((v) => (v.id === id ? { ...v, name } : v)));
  }, []);

  const updateVariationConditions = useCallback((id: string, conditions: RulesCondition[]) => {
    setVariations((prev) => prev.map((v) => (v.id === id ? { ...v, conditions } : v)));
  }, []);

  const reset = useCallback(() => {
    setBase(cloneDeep(baseline.base));
    setVariations(cloneDeep(baseline.variations));
  }, [baseline]);

  const markSaved = useCallback(() => {
    setBaseline({ base: cloneDeep(base), variations: cloneDeep(variations) });
  }, [base, variations]);

  const hasUnsavedChanges = useMemo(() => {
    return (
      JSON.stringify(base) !== JSON.stringify(baseline.base) ||
      JSON.stringify(variations) !== JSON.stringify(baseline.variations)
    );
  }, [base, variations, baseline]);

  return {
    base,
    variations,
    activeSettings,
    activeVariation,
    setField,
    getField,
    addVariation,
    removeVariation,
    renameVariation,
    updateVariationConditions,
    reset,
    markSaved,
    hasUnsavedChanges,
  };
}
