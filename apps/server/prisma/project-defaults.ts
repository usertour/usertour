import { Prisma, PrismaClient } from '@prisma/client';
import { defaultAttributes, defaultEvents } from '@usertour/constants';
import { AttributeBizTypes, EventAttributes } from '@usertour/types';

/**
 * Deploy-time backfill of default events / attributes into existing projects,
 * run from prisma/seed.ts (sibling of migration.ts's condition-id backfill).
 *
 * `initialization` (apps/server src) seeds these only at project CREATION, so a
 * default added later never reaches older projects — trackDirectContentEvent
 * looks the Event up by (codeName, projectId) and no-ops when absent, silently
 * dropping analytics for the new event. This lives in prisma/ rather than the
 * app because production ships prisma/ + packages/ + dist but NOT src, and it's
 * a data-migration concern, not app runtime: a failure here must not take the
 * server down (start.sh continues to `node dist/main`).
 *
 * The default data is imported from @usertour/constants — the SAME source the
 * app's per-project initialization uses — so backfilled rows are byte-identical.
 * Everything is idempotent (createMany skipDuplicates), safe to run on every
 * deploy and across concurrent replicas.
 */

const initializeProject = async (tx: Prisma.TransactionClient, projectId: string) => {
  // Attributes
  const existingAttributes = await tx.attribute.findMany({
    where: { projectId },
    select: { bizType: true, codeName: true },
  });
  const existingAttributeKeys = new Set(
    existingAttributes.map((attribute) => `${attribute.bizType}:${attribute.codeName}`),
  );
  const attributesToCreate = defaultAttributes
    .filter((attribute) => !existingAttributeKeys.has(`${attribute.bizType}:${attribute.codeName}`))
    .map((attribute) => ({ ...attribute, projectId, predefined: true }));
  if (attributesToCreate.length > 0) {
    await tx.attribute.createMany({ data: attributesToCreate, skipDuplicates: true });
  }

  // Events
  const existingEvents = await tx.event.findMany({
    where: { projectId },
    select: { codeName: true },
  });
  const existingEventKeys = new Set(existingEvents.map((event) => event.codeName));
  const eventsToCreate = defaultEvents
    .filter((event) => !existingEventKeys.has(event.codeName))
    .map((event) => ({
      displayName: event.displayName,
      codeName: event.codeName,
      description: event.description,
      projectId,
      predefined: true,
    }));
  if (eventsToCreate.length > 0) {
    await tx.event.createMany({ data: eventsToCreate, skipDuplicates: true });
  }

  // Attribute ↔ event relations
  const attributes = await tx.attribute.findMany({
    where: { bizType: AttributeBizTypes.Event, predefined: true, projectId },
  });
  const events = await tx.event.findMany({ where: { projectId } });
  const existingRelations = await tx.attributeOnEvent.findMany({
    where: { event: { projectId }, attribute: { projectId } },
    select: { attributeId: true, eventId: true },
  });
  const existingRelationKeys = new Set(
    existingRelations.map((relation) => `${relation.attributeId}-${relation.eventId}`),
  );
  const relationsToCreate: { attributeId: string; eventId: string }[] = [];
  for (const defaultEvent of defaultEvents) {
    const event = events.find((candidate) => candidate.codeName === defaultEvent.codeName);
    if (!event) {
      continue;
    }
    for (const attribute of attributes) {
      if (defaultEvent.attributes.includes(attribute.codeName as EventAttributes)) {
        const key = `${attribute.id}-${event.id}`;
        if (!existingRelationKeys.has(key)) {
          relationsToCreate.push({ attributeId: attribute.id, eventId: event.id });
        }
      }
    }
  }
  if (relationsToCreate.length > 0) {
    await tx.attributeOnEvent.createMany({ data: relationsToCreate, skipDuplicates: true });
  }
};

/**
 * Backfill every project that is missing a default. Two aggregate reads
 * pre-filter to only projects short of the full default event / attribute set,
 * so once the fleet is backfilled a deploy is just those reads and zero
 * transactions. (A new attribute↔event relation between a pre-existing default
 * event AND attribute isn't detected here — that rare case needs a one-off run.)
 * Each stale project runs in its own transaction; a single failure is collected
 * with its error, not aborting the rest.
 */
export const backfillProjectDefaults = async (
  prisma: PrismaClient,
): Promise<{
  total: number;
  backfilled: number;
  failed: { projectId: string; error: string }[];
}> => {
  const projects = await prisma.project.findMany({ select: { id: true } });

  const [eventCounts, attributeCounts] = await Promise.all([
    prisma.event.groupBy({
      by: ['projectId'],
      where: { predefined: true },
      _count: { _all: true },
    }),
    prisma.attribute.groupBy({
      by: ['projectId'],
      where: { predefined: true },
      _count: { _all: true },
    }),
  ]);
  const eventCountByProject = new Map(eventCounts.map((row) => [row.projectId, row._count._all]));
  const attributeCountByProject = new Map(
    attributeCounts.map((row) => [row.projectId, row._count._all]),
  );
  const stale = projects.filter(
    ({ id }) =>
      (eventCountByProject.get(id) ?? 0) < defaultEvents.length ||
      (attributeCountByProject.get(id) ?? 0) < defaultAttributes.length,
  );

  const failed: { projectId: string; error: string }[] = [];
  for (const { id } of stale) {
    try {
      await prisma.$transaction((tx) => initializeProject(tx, id));
    } catch (error) {
      failed.push({
        projectId: id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { total: projects.length, backfilled: stale.length - failed.length, failed };
};
