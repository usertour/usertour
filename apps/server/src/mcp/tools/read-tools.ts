import { Capability } from '@usertour/types';
import { Environment } from '@prisma/client';
import { z } from 'zod';

import { ContentExpandType } from '@/openapi/services/content/content.dto';
import { ExpandType } from '@/openapi/services/users/users.dto';
import { OpenApiObjectType } from '@/common/openapi/types';

import { McpTool, McpToolContext } from '../mcp.types';

/**
 * Parse the `cursor` query param out of a paginate() `next`/`previous` URL and
 * expose it on its own. The OpenAPI list methods return full URL strings; for
 * MCP we surface just the opaque cursor token. Returns `null` when there is no
 * next page.
 */
function cursorFromUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }
  try {
    // The list services are passed a synthetic `mcp://…` requestUrl, so parse
    // against a base to be safe even if it's relative.
    const parsed = new URL(url, 'mcp://base');
    return parsed.searchParams.get('cursor');
  } catch {
    return null;
  }
}

/** Shape a paginate() result into the MCP `{ items, nextCursor }` envelope. */
function toListPayload<T>(result: { results: T[]; next: string | null }): {
  items: T[];
  nextCursor: string | null;
} {
  return { items: result.results, nextCursor: cursorFromUrl(result.next) };
}

/** Coerce an untyped JSON arg into a string, or undefined if absent/blank. */
function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Coerce an untyped JSON `limit` arg into a 1..100 integer (default 20). */
function asLimit(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return 20;
  }
  return Math.min(100, Math.max(1, Math.floor(n)));
}

/**
 * Resolve the environment an env-level tool should operate on. If the caller
 * passed `environmentId`, validate it belongs to the project; otherwise fall
 * back to the project's primary environment (then the first live one).
 */
async function resolveEnvironment(
  args: Record<string, unknown>,
  ctx: McpToolContext,
): Promise<Environment> {
  const environmentId = asString(args.environmentId);
  if (environmentId) {
    return ctx.auth.resolveEnvironment(ctx.projectId, environmentId);
  }

  const primary = await ctx.prisma.environment.findFirst({
    where: { projectId: ctx.projectId, deleted: false, isPrimary: true },
  });
  if (primary) {
    return primary;
  }

  const fallback = await ctx.prisma.environment.findFirst({
    where: { projectId: ctx.projectId, deleted: false },
  });
  if (!fallback) {
    throw new Error(
      'No environment found for this project. Pass an explicit "environmentId" argument.',
    );
  }
  return fallback;
}

// Shared zod fragments for the common pagination args. Each is `.optional()` so
// the SDK marks it non-required in the JSON Schema it advertises to clients.
const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .describe('Max items per page (1-100, default 20).');
const cursorSchema = z.string().optional().describe('Pagination cursor from a prior nextCursor.');
const environmentIdSchema = z
  .string()
  .optional()
  .describe('Environment to query (defaults to the primary environment).');

/**
 * Build the read-only MCP tool registry. Each handler re-asserts its capability
 * via `ctx.auth.authorize` (defense-in-depth — registration is already
 * scope-gated in McpService) before calling the OpenAPI facade service and
 * returning a plain JSON-serializable payload.
 *
 * `inputSchema` on each tool is a zod raw shape: the SDK derives the advertised
 * JSON Schema from it and validates incoming arguments against it before the
 * handler runs.
 */
export function buildReadTools(): McpTool[] {
  return [
    {
      name: 'list_content',
      title: 'List content',
      capability: Capability.ContentRead,
      description:
        'List Usertour content (flows, checklists, launchers, banners, surveys) in the ' +
        'project. Filter to a single kind with `type` (e.g. "flow", "checklist", "launcher", ' +
        '"banner", "survey"). Returns `{ items, nextCursor }`; pass `nextCursor` back as ' +
        '`cursor` to page.',
      inputSchema: {
        type: z
          .string()
          .optional()
          .describe('Filter by content kind: flow, checklist, launcher, banner, or survey.'),
        limit: limitSchema,
        cursor: cursorSchema,
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const result = await ctx.services.content.listContent('mcp://content', ctx.projectId, {
          limit: asLimit(args.limit),
          cursor: asString(args.cursor),
        });
        const payload = toListPayload(result);
        const type = asString(args.type);
        if (type) {
          payload.items = payload.items.filter((item) => (item as { type?: string }).type === type);
        }
        return payload;
      },
    },

    {
      name: 'get_content',
      title: 'Get content',
      capability: Capability.ContentRead,
      description:
        'Get a single piece of Usertour content by its id. Optionally `expand` the ' +
        '"editedVersion" and/or "publishedVersion" objects inline.',
      inputSchema: {
        id: z.string().describe('The content id.'),
        expand: z
          .array(z.enum(['editedVersion', 'publishedVersion']))
          .optional()
          .describe('Related objects to inline: editedVersion, publishedVersion.'),
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const id = asString(args.id);
        if (!id) {
          throw new Error('`id` is required.');
        }
        const expand = Array.isArray(args.expand)
          ? (args.expand.filter((e) => typeof e === 'string') as ContentExpandType[])
          : undefined;
        return ctx.services.content.getContent(id, ctx.projectId, { expand });
      },
    },

    {
      name: 'list_attribute_definitions',
      title: 'List attribute definitions',
      capability: Capability.AttributeRead,
      description:
        'List attribute definitions (the schema of custom attributes) for the project. ' +
        'Optionally filter by `scope` ("user", "company", or "companyMembership"). Returns ' +
        '`{ items, nextCursor }`.',
      inputSchema: {
        scope: z
          .enum(['user', 'company', 'companyMembership'])
          .optional()
          .describe('Filter by which object the attribute belongs to.'),
        limit: limitSchema,
        cursor: cursorSchema,
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const scope = asString(args.scope) as OpenApiObjectType | undefined;
        const result = await ctx.services.attributeDefinitions.listAttributeDefinitions(
          'mcp://attribute-definitions',
          ctx.projectId,
          { limit: asLimit(args.limit), cursor: asString(args.cursor), scope },
        );
        return toListPayload(result);
      },
    },

    {
      name: 'list_event_definitions',
      title: 'List event definitions',
      capability: Capability.EventRead,
      description:
        'List event definitions (the catalog of tracked events) for the project. Returns ' +
        '`{ items, nextCursor }`; pass `nextCursor` back as `cursor` to page.',
      inputSchema: {
        limit: limitSchema,
        cursor: cursorSchema,
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const result = await ctx.services.eventDefinitions.listEventDefinitions(
          'mcp://event-definitions',
          ctx.projectId,
          { limit: asLimit(args.limit), cursor: asString(args.cursor) },
        );
        return toListPayload(result);
      },
    },

    {
      name: 'list_users',
      title: 'List users',
      capability: Capability.BizdataRead,
      description:
        'List end-users (the tracked business users your product onboards) in an environment. ' +
        "Defaults to the project's primary environment; pass `environmentId` to target another. " +
        'Filter by `email`, `companyId`, or `segmentId`. Returns `{ items, nextCursor }`.',
      inputSchema: {
        environmentId: environmentIdSchema,
        email: z.string().optional().describe('Filter to a user with this email.'),
        companyId: z.string().optional().describe('Filter to users in this company.'),
        segmentId: z.string().optional().describe('Filter to users in this segment.'),
        limit: limitSchema,
        cursor: cursorSchema,
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const environment = await resolveEnvironment(args, ctx);
        const result = await ctx.services.users.listUsers('mcp://users', environment, {
          limit: asLimit(args.limit),
          cursor: asString(args.cursor),
          email: asString(args.email),
          companyId: asString(args.companyId),
          segmentId: asString(args.segmentId),
        });
        return toListPayload(result);
      },
    },

    {
      name: 'get_user',
      title: 'Get user',
      capability: Capability.BizdataRead,
      description:
        'Get a single end-user by their external id (the id you sent when identifying the ' +
        'user). Defaults to the primary environment; pass `environmentId` to target another.',
      inputSchema: {
        id: z.string().describe('The user external id.'),
        environmentId: environmentIdSchema,
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const id = asString(args.id);
        if (!id) {
          throw new Error('`id` is required.');
        }
        const environment = await resolveEnvironment(args, ctx);
        return ctx.services.users.getUser(id, environment.id, { expand: [ExpandType.COMPANIES] });
      },
    },
  ];
}
