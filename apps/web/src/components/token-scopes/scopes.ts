/**
 * API token scopes as a per-resource access level (No access / Read / Write), shared by the
 * personal-API-key dialog and the OAuth consent screen. Tokens still store the flat,
 * fine-grained capability strings (e.g. `content:create`); this catalog maps each resource's
 * Read / Write level to the capabilities it grants, so the UI is a friendly selector over
 * `scopes: string[]` and the backend guard is unchanged. `Write` always includes `Read`.
 *
 * Resource labels resolve via i18n (`settings.personalApiKeys.scopeResources.*`), levels via
 * (`settings.personalApiKeys.scopeLevels.*`).
 */
import { Capability } from '@usertour/types';

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
    read: [Capability.ContentRead],
    write: [
      Capability.ContentCreate,
      Capability.ContentUpdate,
      Capability.ContentDelete,
      Capability.ContentPublish,
    ],
  },
  {
    key: 'theme',
    labelKey: 'settings.personalApiKeys.scopeResources.theme',
    read: [Capability.ThemeRead],
    write: [Capability.ThemeCreate, Capability.ThemeUpdate, Capability.ThemeDelete],
  },
  {
    key: 'user',
    labelKey: 'settings.personalApiKeys.scopeResources.user',
    read: [Capability.UserRead],
    write: [Capability.UserWrite, Capability.UserDelete],
  },
  {
    key: 'company',
    labelKey: 'settings.personalApiKeys.scopeResources.company',
    read: [Capability.CompanyRead],
    write: [Capability.CompanyWrite, Capability.CompanyDelete],
  },
  {
    key: 'session',
    labelKey: 'settings.personalApiKeys.scopeResources.session',
    read: [Capability.SessionRead],
    write: [Capability.SessionManage],
  },
  {
    key: 'segment',
    labelKey: 'settings.personalApiKeys.scopeResources.segment',
    read: [Capability.SegmentRead],
    write: [Capability.SegmentCreate, Capability.SegmentUpdate, Capability.SegmentDelete],
  },
  {
    key: 'attribute',
    labelKey: 'settings.personalApiKeys.scopeResources.attribute',
    read: [Capability.AttributeRead],
    write: [Capability.AttributeCreate, Capability.AttributeUpdate, Capability.AttributeDelete],
  },
  {
    key: 'event',
    labelKey: 'settings.personalApiKeys.scopeResources.event',
    read: [Capability.EventRead],
    write: [Capability.EventCreate, Capability.EventUpdate, Capability.EventDelete],
  },
  {
    key: 'analytics',
    labelKey: 'settings.personalApiKeys.scopeResources.analytics',
    read: [Capability.AnalyticsRead],
    write: null,
  },
  {
    key: 'environment',
    labelKey: 'settings.personalApiKeys.scopeResources.environment',
    read: [Capability.EnvironmentRead],
    write: [Capability.EnvironmentManage],
  },
];

/** The access level a flat scope list grants for a single resource. */
export const levelOf = (scopes: string[], resource: ScopeResource): ScopeLevel => {
  const has = (cap: string) => scopes.includes(cap);
  const writeCaps = resource.write ?? [];
  // Any write capability ⇒ "write": personal keys always hold the complete write set (the
  // picker sets read/write as a unit), but an OAuth grant may hold a partial set (e.g. only
  // `content:create`) — it can still write, so report it honestly instead of downgrading.
  if (writeCaps.some(has)) {
    return 'write';
  }
  if (resource.read.some(has)) {
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

// The env-targeted capability list is a SERVER-enforced rule now — it lives in
// @usertour/helpers (token-scopes.ts) as the single source of truth; this module
// re-exports it for the form/consent client-side early feedback.
export { environmentSelectionMissing, requiresEnvironmentScope } from '@usertour/helpers';

/** All read-level capabilities across every resource (for a "read-only" quick toggle). */
export const READ_ONLY_CAPABILITIES: string[] = SCOPE_RESOURCES.flatMap((r) => r.read);

// ── Presets ──────────────────────────────────────────────────────────────────

/**
 * A one-click starting point for the personal-key dialog's scope grid, named by
 * PURPOSE ("what is this key for") so the safe-minimal choice is the easy one.
 * Applying a preset replaces the whole scope selection; the grid stays editable
 * afterwards — any manual change that leaves the exact set turns the picker back
 * to its placeholder (custom).
 */
export interface ScopePreset {
  key: string;
  labelKey: string;
  scopes: string[];
}

const capsOf = (level: 'read' | 'write', keys: string[]): string[] =>
  SCOPE_RESOURCES.filter((r) => keys.includes(r.key)).flatMap((r) =>
    level === 'read' ? r.read : [...r.read, ...(r.write ?? [])],
  );

export const SCOPE_PRESETS: readonly ScopePreset[] = [
  {
    // Everything an authoring agent (e.g. an MCP connection) needs: full content
    // authoring + end-user data, but NOT environment management.
    key: 'aiAgent',
    labelKey: 'settings.personalApiKeys.presets.aiAgent',
    scopes: [
      ...capsOf('write', [
        'content',
        'theme',
        'user',
        'company',
        'session',
        'segment',
        'attribute',
        'event',
      ]),
      ...capsOf('read', ['analytics', 'environment']),
    ],
  },
  {
    // Content + its authoring dependencies; no end-user data. Environment read so
    // the key can list environments to publish to.
    key: 'contentAuthoring',
    labelKey: 'settings.personalApiKeys.presets.contentAuthoring',
    scopes: [
      ...capsOf('write', ['content', 'theme', 'attribute', 'event']),
      ...capsOf('read', ['environment']),
    ],
  },
  {
    // Server-side identify/track pipelines: upsert users/companies, nothing else.
    key: 'userDataSync',
    labelKey: 'settings.personalApiKeys.presets.userDataSync',
    scopes: [...capsOf('write', ['user', 'company']), ...capsOf('read', ['environment'])],
  },
  {
    key: 'readOnly',
    labelKey: 'settings.personalApiKeys.presets.readOnly',
    scopes: [...READ_ONLY_CAPABILITIES],
  },
  {
    key: 'allAccess',
    labelKey: 'settings.personalApiKeys.presets.allAccess',
    scopes: SCOPE_RESOURCES.flatMap((r) => [...r.read, ...(r.write ?? [])]),
  },
];

/** The preset exactly matching a scope list (order-independent), or undefined = custom. */
export const presetOf = (scopes: string[]): ScopePreset | undefined => {
  const set = new Set(scopes);
  return SCOPE_PRESETS.find(
    (p) => p.scopes.length === set.size && p.scopes.every((s) => set.has(s)),
  );
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
