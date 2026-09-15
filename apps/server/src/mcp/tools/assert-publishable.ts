import { MemberCannotPublishToEnvironmentError } from '@/common/errors/errors';

import { McpToolContext } from '../mcp.types';

/**
 * The publish-whitelist check for the publish / unpublish tools. On refusal
 * the error names the environments the key MAY publish to (scope ∩ the
 * owner's whitelist) so an agent can self-correct instead of dead-ending —
 * the same courtesy resolveEnvironment extends for a scope miss (E1029).
 */
export async function assertPublishable(ctx: McpToolContext, environmentId: string): Promise<void> {
  try {
    ctx.auth.assertMayPublishTo(ctx.token, environmentId);
  } catch (error) {
    if (!(error instanceof MemberCannotPublishToEnvironmentError)) {
      throw error;
    }
    const ids = ctx.auth.publishableEnvironmentIds(ctx.token) ?? [];
    const usable = ids.length
      ? await ctx.prisma.environment.findMany({
          where: { id: { in: ids }, projectId: ctx.projectId, deleted: false },
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true },
        })
      : [];
    throw new MemberCannotPublishToEnvironmentError(
      usable.map((environment) => ({ id: environment.id, name: environment.name ?? '' })),
    );
  }
}
