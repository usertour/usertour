import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { preProcessFile } from 'typescript';

/**
 * Server layering tripwire (ADR 0015). GraphQL, REST and MCP are protocols;
 * business rules exist once, in the modules every protocol calls. Two layers,
 * and imports only point one way:
 *
 *   entrypoints → modules
 *
 * The composition root (`src/*.ts`) may import anything; nothing imports it.
 *
 * LAYERS classifies every path; it is also the migration status table — a
 * module that has moved lives under `modules/` (the entrypoints will move into
 * `entrypoints/`), one that has not is classified where it stands.
 */

type Layer = 'entrypoints' | 'modules';

const RANK: Record<Layer, number> = { modules: 1, entrypoints: 2 };

/** Path prefix under src/ → layer. The longest matching prefix wins. */
const LAYERS: Record<string, Layer> = {
  // ── entrypoints: protocol surfaces heavy enough to be trees of their own ──
  api: 'entrypoints', // REST v2 — also owns the public representation (codec, zod contracts)
  openapi: 'entrypoints', // REST v1
  mcp: 'entrypoints',
  'web-socket': 'entrypoints', // the gateways; core/ is classified below

  // ── modules: business and infrastructure alike, each with its thin GraphQL adapter ──
  modules: 'modules', // the target layout
  'web-socket/core': 'modules', // delivery runtime (also holds socket plumbing — split on next change)
  adapters: 'modules',
  admin: 'modules',
  ai: 'modules',
  analytics: 'modules',
  'api-token': 'modules',
  attributes: 'modules',
  audit: 'modules',
  auth: 'modules',
  biz: 'modules',
  common: 'modules',
  content: 'modules',
  events: 'modules',
  integrations: 'modules',
  license: 'modules',
  oauth: 'modules',
  outbound: 'modules',
  projects: 'modules',
  shared: 'modules',
  sso: 'modules',
  subscription: 'modules',
  team: 'modules',
  themes: 'modules',
  users: 'modules',
  utilities: 'modules',
  utils: 'modules',
  webhooks: 'modules',
};

/**
 * Modules that import an entrypoint — debt that existed when the rule was
 * introduced, grouped as in ADR 0015. This list may only SHRINK: fixing one
 * fails the test until its entry is removed, and a new such import fails until
 * it is fixed. Adding an entry is the one move reviewers must question.
 */
const KNOWN_VIOLATIONS: readonly string[] = [
  // 1. content pushes to the websocket gateways directly
  'content/content.module.ts -> web-socket/web-socket.module',
  'content/content.service.ts -> web-socket/v2/web-socket-v2.gateway',
  'content/content.service.ts -> web-socket/web-socket.gateway',
  'web-socket/core/content-orchestrator.service.ts -> web-socket/v2/web-socket-v2.dto',
  // 2. integrations and outbound webhooks build payloads with REST v2 mappers
  'integrations/integrations.listener.ts -> api/events/event.mapper',
  'integrations/integrations.service.ts -> api/shared/object-type',
  'integrations/sync/object-mapping.service.ts -> api/shared/codename',
  'integrations/sync/object-sync.listener.ts -> api/events/event.mapper',
  'webhooks/webhook-envelope.ts -> api/shared/object-type',
  'webhooks/webhooks.listener.ts -> api/companies/companies.mapper',
  'webhooks/webhooks.listener.ts -> api/events/event.mapper',
  'webhooks/webhooks.listener.ts -> api/users/users.mapper',
];

/** Protocol types a module's service or pure-logic file must not see. */
const GRAPHQL_PACKAGES = new Set(['@nestjs/graphql']);
/**
 * Folders that hold a module's GraphQL adapter: `dtos/` in the module layout
 * (ADR 0015); the older names still count, so a module moved without being
 * renamed is caught too.
 */
const ADAPTER_SEGMENTS = new Set(['dtos', 'dto', 'models', 'args']);

const SRC = __dirname;

interface ImportEdge {
  /** Importing file, relative to src/. */
  from: string;
  /** The raw specifier as written. */
  specifier: string;
  /** In-repo target relative to src/, extension-less; undefined for packages. */
  target?: string;
}

const sourceFiles = (): string[] =>
  readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .map((file) => file.split('\\').join('/'))
    .filter(
      (file) => file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.d.ts'),
    );

const resolveTarget = (from: string, specifier: string): string | undefined => {
  if (specifier.startsWith('@/')) {
    return specifier.slice(2);
  }
  if (specifier.startsWith('src/')) {
    return specifier.slice(4);
  }
  if (specifier.startsWith('.')) {
    const target = posix.normalize(posix.join(posix.dirname(from), specifier));
    return target.startsWith('..') ? undefined : target;
  }
  return undefined;
};

const collectEdges = (): ImportEdge[] =>
  sourceFiles().flatMap((from) =>
    preProcessFile(readFileSync(join(SRC, from), 'utf8'), true, true).importedFiles.map(
      ({ fileName: specifier }) => ({
        from,
        specifier,
        target: resolveTarget(from, specifier),
      }),
    ),
  );

/** 'root' for the composition root (files directly under src/). */
const layerOf = (path: string): Layer | 'root' | undefined => {
  const segments = path.split('/');
  if (segments.length === 1) {
    return 'root';
  }
  for (let length = segments.length; length > 0; length -= 1) {
    const layer = LAYERS[segments.slice(0, length).join('/')];
    if (layer) {
      return layer;
    }
  }
  return undefined;
};

const stripExtension = (path: string): string => path.replace(/\.ts$/, '');

describe('server layering (ADR 0015)', () => {
  const edges = collectEdges();

  it('classifies every top-level directory, and nothing that no longer exists', () => {
    const topLevelDirectories = readdirSync(SRC).filter((entry) =>
      statSync(join(SRC, entry)).isDirectory(),
    );
    const unclassified = topLevelDirectories.filter((directory) => !LAYERS[directory]);
    const stale = Object.keys(LAYERS).filter((prefix) => !existsSync(join(SRC, prefix)));
    expect({ unclassified, stale }).toEqual({ unclassified: [], stale: [] });
  });

  it('imports only point one way: entrypoints → modules', () => {
    const violations = new Set<string>();
    for (const { from, target } of edges) {
      const importer = layerOf(from);
      if (!target || importer === 'root' || importer === undefined) {
        continue;
      }
      const imported = layerOf(target);
      if (imported === undefined) {
        continue;
      }
      if (imported === 'root' || RANK[importer] < RANK[imported]) {
        violations.add(`${from} -> ${stripExtension(target)}`);
      }
    }
    const known = new Set(KNOWN_VIOLATIONS);
    // A module importing an entrypoint: move the shared piece into a module instead (ADR 0015).
    const introduced = [...violations].filter((violation) => !known.has(violation)).sort();
    // Debt paid off: remove the entry from KNOWN_VIOLATIONS.
    const resolved = [...known].filter((violation) => !violations.has(violation)).sort();
    expect({ introduced, resolved }).toEqual({ introduced: [], resolved: [] });
  });

  it('module services and logic take plain types, never the GraphQL adapter', () => {
    const offenders = edges
      .filter(({ from }) => from.startsWith('modules/'))
      .filter(({ from }) => {
        const segments = from.split('/');
        const isAdapter =
          from.endsWith('.resolver.ts') ||
          from.endsWith('.module.ts') ||
          segments.some((segment) => ADAPTER_SEGMENTS.has(segment));
        return !isAdapter;
      })
      .filter(({ specifier, target }) => {
        if (GRAPHQL_PACKAGES.has(specifier)) {
          return true;
        }
        if (!target) {
          return false;
        }
        return (
          target.endsWith('.resolver') ||
          target.split('/').some((segment) => ADAPTER_SEGMENTS.has(segment))
        );
      })
      .map(({ from, specifier }) => `${from} -> ${specifier}`)
      .sort();
    // Declare the shape in `types/<name>.type.ts` and have the GraphQL input implement it.
    expect(offenders).toEqual([]);
  });
});
