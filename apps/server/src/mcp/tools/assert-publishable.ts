import { MemberCannotPublishToEnvironmentError } from '@/modules/common/errors/errors';

import { McpToolContext } from '../mcp.types';

/**
 * The publish-whitelist check for the publish / unpublish tools. On refusal
 * the error names where the key MAY publish — the owner's whitelist and, of
 * that, what the key's own scope reaches — so an agent can self-correct
 * instead of dead-ending, the same courtesy resolveEnvironment extends for a
 * scope miss (E1029).
 */
export async function assertPublishable(ctx: McpToolContext, environmentId: string): Promise<void> {
  try {
    ctx.auth.assertMayPublishTo(ctx.token, ctx.projectId, environmentId);
  } catch (error) {
    if (!(error instanceof MemberCannotPublishToEnvironmentError)) {
      throw error;
    }
    // Only a role without publish-any-environment reaches here, so the
    // whitelist is a finite list and `publishable` is its scope-narrowed subset.
    const whitelistIds = ctx.token.memberPublishEnvironmentIds ?? [];
    const publishableIds = new Set(
      ctx.auth.publishableEnvironmentIds(ctx.token, ctx.projectId) ?? [],
    );
    const named = whitelistIds.length
      ? await ctx.prisma.environment.findMany({
          where: { id: { in: whitelistIds }, projectId: ctx.projectId, deleted: false },
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true },
        })
      : [];
    const whitelisted = named.map((environment) => ({
      id: environment.id,
      name: environment.name ?? '',
    }));
    throw new MemberCannotPublishToEnvironmentError({
      whitelisted,
      publishable: whitelisted.filter((environment) => publishableIds.has(environment.id)),
    });
  }
}
