/**
 * Personal API token scopes, presented as a per-resource access level
 * (No access / Read / Write). The token still stores the flat, fine-grained
 * capability strings (e.g. `content:create`) — this catalog only maps each
 * resource's Read / Write level to the set of capabilities it grants, so the
 * UI is a friendly selector over `scopes: string[]` and the backend guard is
 * unchanged. `Write` always includes `Read`.
 *
 * Resource labels resolve via i18n (`settings.personalApiKeys.scopeResources.*`),
 * levels via (`settings.personalApiKeys.scopeLevels.*`).
 */
export type ScopeLevel = 'none' | 'read' | 'write';

export interface ScopeResource {
  key: string;
  labelKey: string;
  /** Capabilities granted at the Read level. */
  read: string[];
  /** Capabilities ADDED at the Write level (on top of `read`). `null` = read-only resource. */
  write: string[] | null;
}

export const SCOPE_RESOURCES: readonly ScopeResource[] = [
  {
    key: 'content',
    labelKey: 'settings.personalApiKeys.scopeResources.content',
    read: ['content:read'],
    write: ['content:create', 'content:update', 'content:delete', 'content:publish'],
  },
  {
    key: 'theme',
    labelKey: 'settings.personalApiKeys.scopeResources.theme',
    read: ['theme:read'],
    write: null,
  },
  {
    key: 'user',
    labelKey: 'settings.personalApiKeys.scopeResources.user',
    read: ['user:read'],
    write: ['user:write', 'user:delete'],
  },
  {
    key: 'company',
    labelKey: 'settings.personalApiKeys.scopeResources.company',
    read: ['company:read'],
    write: ['company:write', 'company:delete'],
  },
  {
    key: 'session',
    labelKey: 'settings.personalApiKeys.scopeResources.session',
    read: ['session:read'],
    write: ['session:manage'],
  },
  {
    key: 'attribute',
    labelKey: 'settings.personalApiKeys.scopeResources.attribute',
    read: ['attribute:read'],
    write: ['attribute:create', 'attribute:update', 'attribute:delete'],
  },
  {
    key: 'event',
    labelKey: 'settings.personalApiKeys.scopeResources.event',
    read: ['event:read'],
    write: ['event:create', 'event:update', 'event:delete'],
  },
  {
    key: 'analytics',
    labelKey: 'settings.personalApiKeys.scopeResources.analytics',
    read: ['analytics:read'],
    write: null,
  },
];

/** The access level a flat scope list grants for a single resource. */
export const levelOf = (scopes: string[], resource: ScopeResource): ScopeLevel => {
  const has = (cap: string) => scopes.includes(cap);
  const writeCaps = resource.write ?? [];
  if (writeCaps.length > 0 && resource.read.every(has) && writeCaps.every(has)) {
    return 'write';
  }
  if (resource.read.every(has)) {
    return 'read';
  }
  return 'none';
};

/** Return a new flat scope list with `resource` set to `level` (Write implies Read). */
export const setLevel = (
  scopes: string[],
  resource: ScopeResource,
  level: ScopeLevel,
): string[] => {
  const owned = new Set([...resource.read, ...(resource.write ?? [])]);
  const rest = scopes.filter((s) => !owned.has(s));
  if (level === 'read') {
    return [...rest, ...resource.read];
  }
  if (level === 'write') {
    return [...rest, ...resource.read, ...(resource.write ?? [])];
  }
  return rest;
};

/** Per-resource levels for display (drops resources with no access). */
export const summarizeScopes = (
  scopes: string[],
): { key: string; labelKey: string; level: ScopeLevel }[] =>
  SCOPE_RESOURCES.map((r) => ({
    key: r.key,
    labelKey: r.labelKey,
    level: levelOf(scopes, r),
  })).filter((s) => s.level !== 'none');
