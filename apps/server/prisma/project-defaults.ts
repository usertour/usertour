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
 *
 * KEEP IN SYNC: initializeProject below mirrors apps/server
 * src/common/initialization/initialization.ts's per-project logic (the no-src
 * production constraint forces the duplication — this file can't import from
 * src). Only the diff/insert mechanics are duplicated; the default DATA is
 * shared via @usertour/constants, so the drift-prone part has one source.
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
 * Backfill default events / attributes / relations into every project.
 *
 * No pre-filter — just run initializeProject on every project. It diffs then
 * createMany(skipDuplicates), so it writes only the missing rows and inserts
 * nothing for an already-complete project; the writes are identical whether or
 * not projects are pre-filtered. A filter would only save the diff reads on
 * already-complete projects, and this runs once per deploy from prisma/seed.ts
 * (not per request/boot), so that saving isn't worth the complexity — and
 * running everything removes any chance of a filter silently skipping a stale
 * project (which would permanently drop that project's analytics).
 *
 * Each project runs in its own transaction; a single failure is collected with
 * its error, not aborting the rest.
 */
export const backfillProjectDefaults = async (
  prisma: PrismaClient,
): Promise<{ total: number; failed: { projectId: string; error: string }[] }> => {
  const projects = await prisma.project.findMany({ select: { id: true } });
  console.log(`Starting project defaults backfill for ${projects.length} projects...`);

  const failed: { projectId: string; error: string }[] = [];
  let processed = 0;
  for (const { id } of projects) {
    try {
      await prisma.$transaction((tx) => initializeProject(tx, id));
    } catch (error) {
      failed.push({
        projectId: id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    processed += 1;
    // Progress ping so a large deploy-time run isn't silent (mirrors migration.ts).
    if (processed % 50 === 0) {
      console.log(
        `Project defaults backfill: ${processed}/${projects.length} projects processed...`,
      );
    }
  }
  return { total: projects.length, failed };
};
