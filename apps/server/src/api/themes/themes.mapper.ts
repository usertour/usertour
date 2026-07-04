import {
  type DecompileResolvers,
  decompileConditions,
} from '../content-representation/rules.decompile';
import { ApiObjectType } from '../shared/object-type';
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
    conditions: decompileConditions(v.conditions, resolvers),
    settings: (v.settings ?? {}) as Record<string, unknown>,
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
    ...(expand.includes('settings')
      ? { settings: (node.settings ?? {}) as Record<string, unknown> }
      : {}),
    ...(expand.includes('variations')
      ? { variations: mapVariations(node.variations, resolvers) }
      : {}),
  };
}
