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
      select: { id: true, dataType: true, bizType: true },
    }),
    prisma.segment.findMany({ where: { projectId, deleted: false }, select: { id: true } }),
    prisma.content.findMany({ where: { projectId, deleted: false }, select: { id: true } }),
    prisma.event.findMany({ where: { projectId, deleted: false }, select: { id: true } }),
  ]);
  return {
    attributes: attributes as unknown as ValidateContext['attributes'],
    segments: segments as unknown as ValidateContext['segments'],
    contents: contents as unknown as ValidateContext['contents'],
    events: events as unknown as ValidateContext['events'],
  };
}
