import type { ValidateContext } from '@usertour/helpers';
import type { PrismaService } from 'nestjs-prisma';

/**
 * Load the per-project reference lists the condition validator cross-checks
 * against: attribute datatype / bizType + existence, and segment / content
 * existence. Soft-deleted rows are excluded so a condition can't reference a
 * tombstoned entity. Segments and content are project-scoped (membership is
 * environment-scoped, the definitions are not). Only the fields the validator
 * reads are selected — the rest of each model is irrelevant here.
 */
export async function loadConditionContext(
  prisma: PrismaService,
  projectId: string,
): Promise<ValidateContext> {
  const [attributes, segments, contents, events] = await Promise.all([
    prisma.attribute.findMany({
      where: { projectId, deleted: false },
      // `codeName`: a question's `bindAttribute` references an attribute by codeName,
      // so the usability validator needs it to flag a bind to a non-existent attribute.
      select: { id: true, dataType: true, bizType: true, codeName: true },
    }),
    prisma.segment.findMany({ where: { projectId, deleted: false }, select: { id: true } }),
    prisma.content.findMany({
      where: { projectId, deleted: false },
      // `name` + published-anywhere: the usability validator warns when a
      // start_content / content-list reference targets content that is not
      // published in ANY environment — a dead launch at runtime. `type`: a
      // resource-center list entry declares its target's contentType; the
      // validator warns when the declaration doesn't match the real type.
      select: {
        id: true,
        name: true,
        type: true,
        contentOnEnvironments: { where: { published: true }, select: { id: true }, take: 1 },
      },
    }),
    prisma.event.findMany({
      where: { projectId, deleted: false },
      // `predefined` + `codeName`: a tracker may only fire a CUSTOM event, so the
      // tracker validator rejects a predefined (built-in/system) event by id.
      select: { id: true, codeName: true, predefined: true },
    }),
  ]);
  return {
    attributes: attributes as unknown as ValidateContext['attributes'],
    segments: segments as unknown as ValidateContext['segments'],
    contents: contents.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      publishedAnywhere: c.contentOnEnvironments.length > 0,
    })) as unknown as ValidateContext['contents'],
    events: events as unknown as ValidateContext['events'],
  };
}
