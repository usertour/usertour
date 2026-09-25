import { PrismaService } from 'nestjs-prisma';

import { AttributeBizType } from '@/modules/attributes/constants/attribute-biz-type.constant';

import { AttributeScope, CompileResolvers } from './rules.compile';
import { DecompileResolvers } from './rules.decompile';

/**
 * Single source of truth for building the codec's attribute/event reference
 * resolvers from a project's attribute + event rows. Both the compile (code → id)
 * and decompile (id → code/scope) sides live here so the scope handling can't drift
 * between the services that need them (content-versions, segments, themes).
 *
 * A codeName can exist for user / company / companyMembership (the built-in
 * `signed_up_at`, `first_seen_at`, `last_seen_at`, `name`), so the `attribute`
 * condition resolves a code WITHIN a scope, picked by its `scope` field. EVENT
 * attributes have their own namespace (a codeName can collide with a user
 * attribute), so they get a separate map.
 */

type AttributeRow = { id: string; codeName: string; bizType: number; deleted?: boolean };
type EventRow = { id: string; codeName: string; deleted?: boolean };

const SCOPE_BY_BIZTYPE: Partial<Record<number, AttributeScope>> = {
  [AttributeBizType.USER]: 'user',
  [AttributeBizType.COMPANY]: 'company',
  [AttributeBizType.MEMBERSHIP]: 'companyMembership',
};

/**
 * code → internal id, scoped (write path). Soft-deleted definitions do not
 * resolve (ADR 0016): a write naming one records a miss and is refused, so no
 * new reference to a deleted definition is ever stored.
 */
export function buildCompileResolversFrom(
  allAttributes: AttributeRow[],
  allEvents: EventRow[],
): CompileResolvers {
  const attributes = allAttributes.filter((attribute) => !attribute.deleted);
  const events = allEvents.filter((event) => !event.deleted);
  const attrMap = new Map<string, string>();
  for (const a of attributes) {
    const scope = SCOPE_BY_BIZTYPE[a.bizType];
    if (scope) attrMap.set(`${scope}:${a.codeName}`, a.id);
  }
  const eventAttrMap = new Map(
    attributes.filter((a) => a.bizType === AttributeBizType.EVENT).map((a) => [a.codeName, a.id]),
  );
  const eventMap = new Map(events.map((e) => [e.codeName, e.id]));
  // Unresolved codes fall back to the raw string (legacy behavior several
  // callers rely on for round-tripping), but each miss is RECORDED so write
  // paths can refuse instead of persisting a dead condition whose attrId is a
  // codeName nothing will ever resolve (console sweep batch C).
  const misses: string[] = [];
  return {
    attributeId: (code, scope = 'user') => {
      const id = attrMap.get(`${scope}:${code}`);
      if (id === undefined) misses.push(`attribute "${code}" (scope ${scope})`);
      return id ?? code;
    },
    eventId: (code) => {
      const id = eventMap.get(code);
      if (id === undefined) misses.push(`event "${code}"`);
      return id ?? code;
    },
    eventAttributeId: (code) => {
      const id = eventAttrMap.get(code);
      if (id === undefined) misses.push(`event attribute "${code}"`);
      return id ?? code;
    },
    misses,
  };
}

/** internal id → code / scope (read path). */
export function buildDecompileResolversFrom(
  attributes: AttributeRow[],
  events: EventRow[],
): DecompileResolvers {
  const attrMap = new Map(attributes.map((a) => [a.id, a.codeName]));
  const scopeMap = new Map<string, AttributeScope>(
    attributes.map((a) => [a.id, SCOPE_BY_BIZTYPE[a.bizType] ?? 'user']),
  );
  const eventMap = new Map(events.map((e) => [e.id, e.codeName]));
  return {
    attributeCode: (id) => attrMap.get(id) ?? id,
    attributeScope: (id) => scopeMap.get(id) ?? 'user',
    eventCode: (id) => eventMap.get(id) ?? id,
    // Catalog-backed: undefined = the id is NOT in the project's definitions
    // (deleted) — the decompiler emits `unsupported` instead of leaking the id.
    tryAttributeCode: (id) => attrMap.get(id),
    tryEventCode: (id) => eventMap.get(id),
  };
}

/**
 * Load a project's attribute + event catalogs — the shared input for both resolver
 * maps, defined once here (was copy-pasted across content-versions / themes /
 * segments). Soft-deleted rows are INCLUDED, flagged: decompile (id→code) must
 * still resolve a deleted definition's id to its readable codeName (else the API
 * shows a raw id), while compile (code→id) skips them.
 */
export async function loadResolverCatalogs(prisma: PrismaService, projectId: string) {
  return Promise.all([
    prisma.attribute.findMany({
      where: { projectId },
      select: { id: true, codeName: true, bizType: true, deleted: true },
    }),
    prisma.event.findMany({
      where: { projectId },
      select: { id: true, codeName: true, deleted: true },
    }),
  ]);
}

/** Load + build the decompile (id→code) resolvers for a project. */
export async function loadDecompileResolvers(
  prisma: PrismaService,
  projectId: string,
): Promise<DecompileResolvers> {
  const [attributes, events] = await loadResolverCatalogs(prisma, projectId);
  return buildDecompileResolversFrom(attributes, events);
}

/** Load + build the compile (code→id) resolvers for a project. */
export async function loadCompileResolvers(
  prisma: PrismaService,
  projectId: string,
): Promise<CompileResolvers> {
  const [attributes, events] = await loadResolverCatalogs(prisma, projectId);
  return buildCompileResolversFrom(attributes, events);
}

/**
 * Load the catalogs ONCE and build BOTH resolver maps — a write compiles the
 * representation and then decompiles the saved row for its response, and both
 * directions share the same catalogs.
 */
export async function loadResolvers(
  prisma: PrismaService,
  projectId: string,
): Promise<{ compile: CompileResolvers; decompile: DecompileResolvers }> {
  const [attributes, events] = await loadResolverCatalogs(prisma, projectId);
  return {
    compile: buildCompileResolversFrom(attributes, events),
    decompile: buildDecompileResolversFrom(attributes, events),
  };
}
