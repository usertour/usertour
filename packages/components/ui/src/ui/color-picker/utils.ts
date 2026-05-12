import { TAILWINDCSS_COLORS } from '@usertour-packages/constants';
import { firstLetterToUpperCase, storage } from '@usertour/helpers';
import type { TailwindColorData } from './types';

// ============================================================================
// Constants
// ============================================================================

export const MAX_RECENT_COLORS = 20;
export const TAILWIND_DOCS_URL = 'https://tailwindcss.com/docs/customizing-colors';

export const SELECTED_COLOR_SERIES = [
  'slate',
  'neutral',
  'red',
  'orange',
  'yellow',
  'lime',
  'green',
  'blue',
  'purple',
  'pink',
] as const;

export const SELECTED_COLOR_LEVELS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
] as const;

export const HEX_ERROR_MESSAGE =
  'Must be a HEX value using the format #rgb, #rrggbb, or #rrggbbaa.';

// ============================================================================
// Recent Colors Storage
// ============================================================================

export const getRecentColors = (storageKey: string): string[] => {
  try {
    const stored = storage.getLocalStorage(storageKey) as string[] | undefined;
    return stored ?? [];
  } catch {
    return [];
  }
};

export const saveRecentColor = (storageKey: string, color: string): string[] => {
  const recent = getRecentColors(storageKey);
  const normalized = color.toLowerCase();
  const filtered = recent.filter((c) => c.toLowerCase() !== normalized);
  const updated = [normalized, ...filtered].slice(0, MAX_RECENT_COLORS);
  storage.setLocalStorage(storageKey, updated, -1);
  return updated;
};

export const removeRecentColor = (storageKey: string, colorToRemove: string): string[] => {
  const recent = getRecentColors(storageKey);
  const updated = recent.filter((c) => c.toLowerCase() !== colorToRemove.toLowerCase());
  storage.setLocalStorage(storageKey, updated, -1);
  return updated;
};

// ============================================================================
// Color Data Processing
// ============================================================================

export const formatTailwindColorData = (
  colors: Record<string, Record<string, string>>,
): TailwindColorData[][] => {
  const rows: TailwindColorData[][] = [];
  for (const colorName of SELECTED_COLOR_SERIES) {
    const colorSeries = colors[colorName];
    if (!colorSeries) continue;
    const cols: TailwindColorData[] = [];
    for (const level of SELECTED_COLOR_LEVELS) {
      const color = colorSeries[level];
      if (color) {
        cols.push({ name: colorName, level, color });
      }
    }
    rows.push(cols);
  }
  return rows;
};

export const tailwindColorData = formatTailwindColorData(TAILWINDCSS_COLORS);

// Create a map for quick lookup of Tailwind colors by hex value
export const tailwindColorMap = new Map<string, TailwindColorData>(
  tailwindColorData.flatMap((row) => row.map((col) => [col.color.toLowerCase(), col])),
);

export const getTailwindColorInfo = (hex: string): TailwindColorData | undefined => {
  return tailwindColorMap.get(hex.toLowerCase());
};

// ============================================================================
// Color Validation
// ============================================================================

// Validate HEX color format: #rgb, #rrggbb, or #rrggbbaa
export const isValidHexColor = (color: string): boolean => {
  if (!color) return true;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/i.test(color);
};

// Normalize HEX color: convert #rgb to #rrggbb, #rgba to #rrggbbaa
export const normalizeHexColor = (color: string): string => {
  if (!color.startsWith('#')) return color;
  const hex = color.slice(1);
  // #rgb -> #rrggbb or #rgba -> #rrggbbaa
  if (hex.length === 3 || hex.length === 4) {
    return `#${hex
      .split('')
      .map((c) => `${c}${c}`)
      .join('')}`;
  }
  return color;
};

export const formatColorTooltip = (hex: string): string => {
  const tailwindInfo = getTailwindColorInfo(hex);
  if (tailwindInfo) {
    return `Tailwind ${firstLetterToUpperCase(tailwindInfo.name)} ${tailwindInfo.level}: ${tailwindInfo.color}`;
  }
  return hex;
};
