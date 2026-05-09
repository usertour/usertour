import {
  convertSettings,
  cuid,
  generateStateColors,
  mergeThemeDefaultSettings,
} from '@usertour/helpers';
import type { RulesCondition, ThemeTypesSetting, ThemeVariation } from '@usertour/types';
import isEqual from 'fast-deep-equal';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cloneDeep, getPath, setPath } from './draft-util';

// Cascade rules — when a "trigger" path changes, derive auxiliary paths and
// patch them in the same setField call. Mirrors v1's manual recomputation of
// autoHover / autoActive across base colors and primary/secondary buttons so
// users never have to maintain those fields by hand.
const resolveAuto = (value: string, fallback: string | undefined): string | undefined =>
  value === 'Auto' ? fallback : value;

const CASCADE_RULES: Array<{
  trigger: string;
  derive: (settings: ThemeTypesSetting) => Record<string, string>;
}> = [
  // Base colors -----------------------------------------------------------
  {
    trigger: 'brandColor.background',
    derive: (s) => {
      const brand = generateStateColors(s.brandColor.background, s.brandColor.color);
      const main = generateStateColors(s.mainColor.background, s.brandColor.background);
      return {
        'brandColor.autoHover': brand.hover,
        'brandColor.autoActive': brand.active,
        'mainColor.autoHover': main.hover,
        'mainColor.autoActive': main.active,
      };
    },
  },
  {
    trigger: 'brandColor.color',
    derive: (s) => {
      const brand = generateStateColors(s.brandColor.background, s.brandColor.color);
      return {
        'brandColor.autoHover': brand.hover,
        'brandColor.autoActive': brand.active,
      };
    },
  },
  {
    trigger: 'mainColor.background',
    derive: (s) => {
      const main = generateStateColors(s.mainColor.background, s.brandColor.background);
      return {
        'mainColor.autoHover': main.hover,
        'mainColor.autoActive': main.active,
      };
    },
  },
  // Primary button --------------------------------------------------------
  // textColor: when value is 'Auto', resolve to brand.color; auto* mirror it.
  {
    trigger: 'buttons.primary.textColor.color',
    derive: (s) => {
      const resolved = resolveAuto(s.buttons.primary.textColor.color, s.brandColor.color);
      if (!resolved) return {} as Record<string, string>;
      return {
        'buttons.primary.textColor.autoHover': resolved,
        'buttons.primary.textColor.autoActive': resolved,
      };
    },
  },
  // backgroundColor: 'Auto' → brand.background; states from generateStateColors(bg, brand.color).
  {
    trigger: 'buttons.primary.backgroundColor.background',
    derive: (s) => {
      const resolved = resolveAuto(
        s.buttons.primary.backgroundColor.background,
        s.brandColor.background,
      );
      const accent = s.brandColor.color;
      if (!resolved || !accent) return {} as Record<string, string>;
      const states = generateStateColors(resolved, accent);
      return {
        'buttons.primary.backgroundColor.autoHover': states.hover,
        'buttons.primary.backgroundColor.autoActive': states.active,
      };
    },
  },
  // border.color: 'Auto' → falls back to brand.background; primary uses generateStateColors.
  {
    trigger: 'buttons.primary.border.color.color',
    derive: (s) => {
      const resolved = resolveAuto(s.buttons.primary.border.color.color, s.brandColor.background);
      const accent = s.brandColor.color;
      if (!resolved || !accent) return {} as Record<string, string>;
      const states = generateStateColors(resolved, accent);
      return {
        'buttons.primary.border.color.autoHover': states.hover,
        'buttons.primary.border.color.autoActive': states.active,
      };
    },
  },
  // Secondary button ------------------------------------------------------
  // textColor: 'Auto' → brand.background (inverted vs primary); auto* mirror resolved.
  {
    trigger: 'buttons.secondary.textColor.color',
    derive: (s) => {
      const resolved = resolveAuto(s.buttons.secondary.textColor.color, s.brandColor.background);
      if (!resolved) return {} as Record<string, string>;
      return {
        'buttons.secondary.textColor.autoHover': resolved,
        'buttons.secondary.textColor.autoActive': resolved,
      };
    },
  },
  // backgroundColor: 'Auto' → mainColor.background; accent for state generation = brand.background.
  {
    trigger: 'buttons.secondary.backgroundColor.background',
    derive: (s) => {
      const resolved = resolveAuto(
        s.buttons.secondary.backgroundColor.background,
        s.mainColor.background,
      );
      const accent = s.brandColor.background;
      if (!resolved || !accent) return {} as Record<string, string>;
      const states = generateStateColors(resolved, accent);
      return {
        'buttons.secondary.backgroundColor.autoHover': states.hover,
        'buttons.secondary.backgroundColor.autoActive': states.active,
      };
    },
  },
  // border.color: secondary mirrors resolved value (no generateStateColors).
  {
    trigger: 'buttons.secondary.border.color.color',
    derive: (s) => {
      const resolved = resolveAuto(s.buttons.secondary.border.color.color, s.brandColor.background);
      if (!resolved) return {} as Record<string, string>;
      return {
        'buttons.secondary.border.color.autoHover': resolved,
        'buttons.secondary.border.color.autoActive': resolved,
      };
    },
  },
];

const applyCascade = (settings: ThemeTypesSetting, changedPath: string): ThemeTypesSetting => {
  const rule = CASCADE_RULES.find((r) => r.trigger === changedPath);
  if (!rule) return settings;
  let next = settings;
  for (const [path, value] of Object.entries(rule.derive(next))) {
    next = setPath(
      next as unknown as Record<string, unknown>,
      path,
      value,
    ) as unknown as ThemeTypesSetting;
  }
  return next;
};

export interface UseThemeDraftArgs {
  initialBase: ThemeTypesSetting;
  initialVariations: ThemeVariation[];
  activeVariationId: string | null;
}

export interface UseThemeDraftResult {
  base: ThemeTypesSetting;
  variations: ThemeVariation[];
  activeSettings: ThemeTypesSetting;
  // activeSettings post-`convertSettings`: every "Auto" sentinel resolved to a
  // concrete color, used by ColorField to display the Auto fallback color.
  finalSettings: ThemeTypesSetting;
  activeVariation: ThemeVariation | null;
  setField: (path: string, value: unknown) => void;
  getField: <T = unknown>(path: string) => T | undefined;
  addVariation: (name?: string) => string;
  removeVariation: (id: string) => void;
  renameVariation: (id: string, name: string) => void;
  updateVariationConditions: (id: string, conditions: RulesCondition[]) => void;
  // Reorder variations by id. The list order is semantic — first match wins
  // when multiple variations' conditions are true at runtime.
  reorderVariations: (fromIndex: number, toIndex: number) => void;
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

// Themes saved before a schema field existed will lack that key in the DB row.
// Merging defaults at draft init guarantees the editable draft always has the
// full structure, so schema `visibleWhen` predicates can read nested paths
// directly without optional chaining for every newly added field.
const hydrateVariations = (variations: ThemeVariation[]): ThemeVariation[] =>
  variations.map((v) => ({ ...v, settings: mergeThemeDefaultSettings(v.settings) }));

export function useThemeDraft({
  initialBase,
  initialVariations,
  activeVariationId,
}: UseThemeDraftArgs): UseThemeDraftResult {
  const initial: Snapshot = useMemo(
    () => ({
      base: mergeThemeDefaultSettings(initialBase),
      variations: hydrateVariations(initialVariations),
    }),
    [initialBase, initialVariations],
  );

  const [base, setBase] = useState<ThemeTypesSetting>(() => cloneDeep(initial.base));
  const [variations, setVariations] = useState<ThemeVariation[]>(() =>
    cloneDeep(initial.variations),
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
        setBase((prev) => {
          const after = setPath(
            prev as unknown as Record<string, unknown>,
            path,
            value,
          ) as unknown as ThemeTypesSetting;
          return applyCascade(after, path);
        });
      } else {
        setVariations((prev) =>
          prev.map((v) => {
            if (v.id !== activeVariationId) return v;
            const after = setPath(
              v.settings as unknown as Record<string, unknown>,
              path,
              value,
            ) as unknown as ThemeTypesSetting;
            return { ...v, settings: applyCascade(after, path) };
          }),
        );
      }
    },
    [activeVariationId],
  );

  const getField = useCallback(
    <T>(path: string): T | undefined => getPath(activeSettings, path) as T | undefined,
    [activeSettings],
  );

  const finalSettings = useMemo(() => convertSettings(activeSettings), [activeSettings]);

  // Seed new variations from the current Base, not from `defaultSettings`.
  // Variations are deltas off Base for a specific audience — starting from
  // factory defaults would wipe out everything the author has tuned in
  // Base and force them to redo it before they can begin diverging. To
  // duplicate an existing variation, that's a separate explicit action.
  const addVariation = useCallback(
    (name?: string): string => {
      const id = cuid();
      const next: ThemeVariation = {
        id,
        name: name ?? '',
        conditions: [],
        settings: cloneDeep(base),
      };
      setVariations((prev) => {
        const fallbackName = name ?? `Variation ${prev.length + 1}`;
        return [...prev, { ...next, name: next.name || fallbackName }];
      });
      return id;
    },
    [base],
  );

  const removeVariation = useCallback((id: string) => {
    setVariations((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const renameVariation = useCallback((id: string, name: string) => {
    setVariations((prev) => prev.map((v) => (v.id === id ? { ...v, name } : v)));
  }, []);

  const updateVariationConditions = useCallback((id: string, conditions: RulesCondition[]) => {
    setVariations((prev) => prev.map((v) => (v.id === id ? { ...v, conditions } : v)));
  }, []);

  const reorderVariations = useCallback((fromIndex: number, toIndex: number) => {
    setVariations((prev) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setBase(cloneDeep(baseline.base));
    setVariations(cloneDeep(baseline.variations));
  }, [baseline]);

  const markSaved = useCallback(() => {
    setBaseline({ base: cloneDeep(base), variations: cloneDeep(variations) });
  }, [base, variations]);

  // Deep equality (order-insensitive) instead of JSON.stringify so that
  // server-side key reordering doesn't read as a dirty change. Variations
  // are stored as JSONB, which Postgres normalizes alphabetically — keys
  // we constructed in insertion order come back rearranged, so the same
  // data round-trips with a different stringification. JSON.stringify
  // would flag that as dirty even though the values are identical;
  // fast-deep-equal compares the values themselves and reports clean.
  const hasUnsavedChanges = useMemo(() => {
    return !isEqual(base, baseline.base) || !isEqual(variations, baseline.variations);
  }, [base, variations, baseline]);

  return {
    base,
    variations,
    activeSettings,
    finalSettings,
    activeVariation,
    setField,
    getField,
    addVariation,
    removeVariation,
    renameVariation,
    updateVariationConditions,
    reorderVariations,
    reset,
    markSaved,
    hasUnsavedChanges,
  };
}
