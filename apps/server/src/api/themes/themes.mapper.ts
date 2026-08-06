import { convertSettings } from '@usertour/helpers';
import type { ThemeTypesSetting } from '@usertour/types';

import { type DecompileResolvers, decompileWhen } from '../content-representation/rules.decompile';
import { ApiObjectType } from '../shared/object-type';
import { normalizeStoredSettings } from './settings.schema';
import type { Theme, ThemeExpand } from './themes.schema';

type ThemeNode = {
  id: string;
  name: string;
  isDefault: boolean;
  isSystem?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  settings?: unknown;
  variations?: unknown;
};

type InternalVariation = {
  id?: string;
  name?: string;
  conditions?: unknown;
  settings?: unknown;
};

/** Decompile the stored variations (internal condition ids -> stable codes). */
function mapVariations(raw: unknown, resolvers: DecompileResolvers) {
  return (Array.isArray(raw) ? (raw as InternalVariation[]) : []).map((v) => ({
    id: v.id ?? '',
    name: v.name ?? '',
    // decompileWhen (not decompileConditions): an OR top-level list must wrap
    // in group{match:'any'} — see segments.mapper for the full reasoning.
    conditions: decompileWhen(v.conditions, resolvers),
    settings: normalizeStoredSettings((v.settings ?? {}) as Record<string, unknown>),
  }));
}

/**
 * Pure domain-theme -> API theme mapping. `settings` / `variations` are only
 * included when their expand is requested; variation conditions are decompiled
 * with the project's id->code resolvers.
 */
export function mapTheme(
  node: ThemeNode,
  expand: ThemeExpand[],
  resolvers: DecompileResolvers,
): Theme {
  return {
    id: node.id,
    object: ApiObjectType.THEME,
    name: node.name,
    isDefault: node.isDefault,
    isSystem: Boolean(node.isSystem),
    createdAt: new Date(node.createdAt).toISOString(),
    updatedAt: new Date(node.updatedAt).toISOString(),
    // ALWAYS present, no expand: the base projection otherwise makes two themes
    // look identical while one carries a dark-mode variation and the other does
    // not — switching content onto the variation-less one silently downgrades
    // every user those conditions targeted (maintenance-round finding).
    variationCount: Array.isArray(node.variations) ? node.variations.length : 0,
    ...(expand.includes('settings')
      ? // Read-side coercion of stored builder shapes (numeric strings, padded
        // colors) so the read matches the declared types — see
        // normalizeStoredSettings.
        { settings: normalizeStoredSettings((node.settings ?? {}) as Record<string, unknown>) }
      : {}),
    ...(expand.includes('resolvedSettings')
      ? // The render truth: the SAME derivation pipeline the SDK runs
        // (convertSettings), then normalized to the contract shape — every
        // "Auto" concrete, no derivation-cache keys.
        {
          resolvedSettings: normalizeStoredSettings(
            convertSettings((node.settings ?? {}) as unknown as ThemeTypesSetting),
          ) as unknown as Record<string, unknown>,
        }
      : {}),
    ...(expand.includes('variations')
      ? { variations: mapVariations(node.variations, resolvers) }
      : {}),
  };
}
