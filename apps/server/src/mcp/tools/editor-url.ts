import { CONTENT_TYPE_PATH_SEGMENT } from '@usertour/constants';
import { ContentDataType } from '@usertour/types';

import { McpToolContext } from '../mcp.types';

/**
 * Dashboard deep link for a content: `{dashboard}/env/{envId}/{segment}/{id}/detail`
 * — the bridge from an MCP authoring session to the visual editor, so a human
 * can open what the agent built and review it. Returns undefined when the
 * dashboard URL isn't configured (self-host without APP_HOMEPAGE_URL) or the
 * type has no dashboard page; callers then omit the field.
 *
 * The environment only picks WHICH environment's detail view opens — content
 * itself is project-level — so unlike resolveEnvironment (which refuses to
 * choose among several environments for an ACTION), a best-effort pick is
 * correct here: the explicit id when the caller has one (publish), else the
 * oldest environment in the token's scope.
 */
export async function editorUrlFor(
  ctx: McpToolContext,
  type: string,
  contentId: string,
  environmentId?: string,
): Promise<string | undefined> {
  const base = ctx.dashboardUrl.replace(/\/+$/, '');
  const segment = CONTENT_TYPE_PATH_SEGMENT[type as ContentDataType];
  if (!base || !segment) {
    return undefined;
  }
  let envId = environmentId;
  if (!envId) {
    const all = await ctx.prisma.environment.findMany({
      where: { projectId: ctx.projectId, deleted: false },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    const allowed = ctx.auth.allowedEnvironmentIds(ctx.token);
    envId = (allowed ? all.filter((e) => allowed.includes(e.id)) : all)[0]?.id;
  }
  if (!envId) {
    return undefined;
  }
  return `${base}/env/${envId}/${segment}/${contentId}/detail`;
}

/** Spread `editorUrl` onto a tool payload, omitting the key entirely when there is no link. */
export function withEditorUrl<T extends object>(payload: T, url: string | undefined): T {
  return url ? { ...payload, editorUrl: url } : payload;
}
