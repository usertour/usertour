import { PrismaService } from 'nestjs-prisma';

import { AttributeBizType } from '@/attributes/models/attribute.model';

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

type AttributeRow = { id: string; codeName: string; bizType: number };
type EventRow = { id: string; codeName: string };

const SCOPE_BY_BIZTYPE: Partial<Record<number, AttributeScope>> = {
  [AttributeBizType.USER]: 'user',
  [AttributeBizType.COMPANY]: 'company',
  [AttributeBizType.MEMBERSHIP]: 'companyMembership',
};

/** code → internal id, scoped (write path). */
export function buildCompileResolversFrom(
  attributes: AttributeRow[],
  events: EventRow[],
): CompileResolvers {
  const attrMap = new Map<string, string>();
  for (const a of attributes) {
    const scope = SCOPE_BY_BIZTYPE[a.bizType];
    if (scope) attrMap.set(`${scope}:${a.codeName}`, a.id);
  }
  const eventAttrMap = new Map(
    attributes.filter((a) => a.bizType === AttributeBizType.EVENT).map((a) => [a.codeName, a.id]),
  );
  const eventMap = new Map(events.map((e) => [e.codeName, e.id]));
  return {
    attributeId: (code, scope = 'user') => attrMap.get(`${scope}:${code}`) ?? code,
    eventId: (code) => eventMap.get(code) ?? code,
    eventAttributeId: (code) => eventAttrMap.get(code) ?? code,
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
 * segments). Soft-deleted rows are intentionally INCLUDED: decompile (id→code)
 * must still resolve a since-deleted attribute's id to its readable codeName (else
 * the API shows a raw id), and the write path rejects references to deleted attrs
 * downstream (condition-context filters them). That is why these catalogs do NOT
 * apply the `deleted: false` the usability validator uses.
 */
export async function loadResolverCatalogs(prisma: PrismaService, projectId: string) {
  return Promise.all([
    prisma.attribute.findMany({
      where: { projectId },
      select: { id: true, codeName: true, bizType: true },
    }),
    prisma.event.findMany({ where: { projectId }, select: { id: true, codeName: true } }),
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
