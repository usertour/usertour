import { Capability } from '@usertour/types';
import { Environment } from '@prisma/client';
import { z } from 'zod';

import { CompanyExpand } from '@/api/companies/companies.schema';
import { ContentExpand } from '@/api/content/content.schema';
import { representationStepInput } from '@/api/content-representation/representation.schema';
import { representationResourceCenter } from '@/api/content-representation/resource-center.schema';
import {
  representationBanner,
  representationChecklist,
  representationLauncher,
  representationTracker,
} from '@/api/content-representation/version-data.schema';
import { SessionExpand } from '@/api/content-sessions/content-sessions.schema';
import { VersionExpand } from '@/api/content-versions/content-versions.schema';
import { createdAtRangeFields, nameSearchField } from '@/api/shared/filters';

import { McpTool, McpToolContext } from '../mcp.types';
import { AUTHORING_GUIDE } from './authoring-guide';

/**
 * Parse the `cursor` query param out of a paginate() `next`/`previous` URL and
 * expose it on its own. The v2 list methods return full URL strings; for MCP we
 * surface just the opaque cursor token. Returns `null` when there is no next page.
 */
function cursorFromUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }
  try {
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

/** Coerce an untyped JSON `orderBy` arg into the createdAt sort literal (the value
 * every v2 list query accepts), or undefined. */
function asOrderBy(value: unknown): 'createdAt' | '-createdAt' | undefined {
  return value === 'createdAt' || value === '-createdAt' ? value : undefined;
}

/** Coerce an untyped JSON `expand` arg into a string array, or undefined if absent. */
function asStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? (value.filter((v) => typeof v === 'string') as string[])
    : undefined;
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
 * passed `environmentId`, validate it belongs to the project; otherwise fall back
 * to the project's primary environment (then the first live one).
 */
export async function resolveEnvironment(
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
// Every v2 list service honors orderBy (createdAt = oldest first, -createdAt = newest first).
const orderBySchema = z
  .enum(['createdAt', '-createdAt'])
  .optional()
  .describe('Sort order: createdAt (oldest first) or -createdAt (newest first).');
export const environmentIdSchema = z
  .string()
  .optional()
  .describe('Environment to target (defaults to the primary environment).');

/**
 * Build the read-only MCP tool registry. Each tool is a thin binding over a v2
 * `src/api` service (the same contract the v2 REST endpoints expose) — content /
 * attribute / event are project-scoped; users are environment-scoped. Each
 * handler re-asserts its capability via `ctx.auth.authorize` (defense in depth;
 * registration is already scope-gated in McpService) and returns a plain
 * JSON-serializable payload. `inputSchema` is a zod raw shape the SDK validates.
 */
export function buildReadTools(): McpTool[] {
  return [
    {
      name: 'get_authoring_guide',
      title: 'How to author content',
      capability: Capability.ContentRead,
      description:
        'Read this BEFORE authoring content. Returns the conventions for building usable ' +
        'Usertour content: the create→update→validate→publish lifecycle, step types and ' +
        'targets, wiring goto_step by key, the markdown subset, frequency, and what each ' +
        'content type needs to be publishable.',
      inputSchema: {},
      async handler(_args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        return { guide: AUTHORING_GUIDE };
      },
    },

    {
      name: 'get_content_schema',
      title: 'Get the write schema for a content type',
      capability: Capability.ContentRead,
      description:
        'Return the JSON Schema for the body you write to `update_content_version` for a content ' +
        'type: `flow` → the `steps` array item; checklist / launcher / banner / tracker / ' +
        'resource-center → the `data` object. The `data` arg is polymorphic so its schema is NOT ' +
        'on the tool itself — fetch it here before authoring a non-flow type. Pair with ' +
        'get_authoring_guide.',
      inputSchema: {
        type: z
          .enum(['flow', 'checklist', 'launcher', 'banner', 'tracker', 'resource-center'])
          .describe('Content kind whose write-body schema to return.'),
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const type = String(args.type);
        // `unrepresentable: 'any'` degrades any non-JSON-Schema-able node to `{}`
        // instead of throwing, so the discovery tool never fails.
        const toJson = (s: z.ZodType) => z.toJSONSchema(s, { unrepresentable: 'any' });
        if (type === 'flow') {
          return { type, body: 'steps', schema: toJson(z.array(representationStepInput)) };
        }
        const byType: Record<string, z.ZodType> = {
          checklist: representationChecklist,
          launcher: representationLauncher,
          banner: representationBanner,
          tracker: representationTracker,
          'resource-center': representationResourceCenter,
        };
        return { type, body: 'data', schema: toJson(byType[type]) };
      },
    },

    {
      name: 'list_content',
      title: 'List content',
      capability: Capability.ContentRead,
      description:
        'List Usertour content (flows, checklists, launchers, banners, surveys) in the ' +
        'project. Filter by `name`, `type`, `published`, or a created-at range. Returns ' +
        '`{ items, nextCursor }`; pass `nextCursor` back as `cursor` to page.',
      inputSchema: {
        ...nameSearchField,
        type: z
          .string()
          .optional()
          .describe('Filter by content kind: flow, checklist, launcher, banner, or survey.'),
        published: z
          .boolean()
          .optional()
          .describe(
            'Filter to content published in at least one environment (true) or none (false).',
          ),
        expand: z
          .array(z.enum(['editedVersion', 'publishedVersion']))
          .optional()
          .describe('Inline editedVersion / publishedVersion on each item (avoids per-item get).'),
        ...createdAtRangeFields,
        limit: limitSchema,
        cursor: cursorSchema,
        orderBy: orderBySchema,
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const result = await ctx.services.content.list('mcp://content', ctx.projectId, {
          limit: asLimit(args.limit),
          cursor: asString(args.cursor),
          orderBy: asOrderBy(args.orderBy),
          name: asString(args.name),
          type: asString(args.type),
          published: typeof args.published === 'boolean' ? args.published : undefined,
          expand: asStringArray(args.expand) as ContentExpand[] | undefined,
          createdAfter: asString(args.createdAfter),
          createdBefore: asString(args.createdBefore),
        });
        return toListPayload(result);
      },
    },

    {
      name: 'get_content',
      title: 'Get content',
      capability: Capability.ContentRead,
      description:
        'Get a single piece of Usertour content by its id. Optionally `expand` the ' +
        '"editedVersion" and/or "publishedVersion" objects inline. Publish state is ' +
        'per-environment under `environments[]`.',
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
          ? (args.expand.filter((e) => typeof e === 'string') as ContentExpand[])
          : undefined;
        return ctx.services.content.get(id, ctx.projectId, { expand });
      },
    },

    {
      name: 'list_attribute_definitions',
      title: 'List attribute definitions',
      capability: Capability.AttributeRead,
      description:
        'List attribute definitions (the schema of custom attributes) for the project. ' +
        'Optionally filter by `name` or `scope` ("user", "company", or "companyMembership"). ' +
        'Returns `{ items, nextCursor }`.',
      inputSchema: {
        ...nameSearchField,
        scope: z
          .enum(['user', 'company', 'companyMembership'])
          .optional()
          .describe('Filter by which object the attribute belongs to.'),
        limit: limitSchema,
        cursor: cursorSchema,
        orderBy: orderBySchema,
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const result = await ctx.services.attributeDefinitions.list(
          'mcp://attribute-definitions',
          ctx.projectId,
          {
            limit: asLimit(args.limit),
            cursor: asString(args.cursor),
            orderBy: asOrderBy(args.orderBy),
            name: asString(args.name),
            scope: asString(args.scope),
          },
        );
        return toListPayload(result);
      },
    },

    {
      name: 'list_event_definitions',
      title: 'List event definitions',
      capability: Capability.EventRead,
      description:
        'List event definitions (the catalog of tracked events) for the project. Optionally ' +
        'filter by `name`. Returns `{ items, nextCursor }`; pass `nextCursor` back as `cursor` to page.',
      inputSchema: {
        ...nameSearchField,
        limit: limitSchema,
        cursor: cursorSchema,
        orderBy: orderBySchema,
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const result = await ctx.services.eventDefinitions.list(
          'mcp://event-definitions',
          ctx.projectId,
          {
            limit: asLimit(args.limit),
            cursor: asString(args.cursor),
            orderBy: asOrderBy(args.orderBy),
            name: asString(args.name),
          },
        );
        return toListPayload(result);
      },
    },

    {
      name: 'list_users',
      title: 'List users',
      capability: Capability.UserRead,
      description:
        'List end-users (the tracked business users your product onboards) in an environment. ' +
        "Defaults to the project's primary environment; pass `environmentId` to target another. " +
        'Filter by `email`, `companyId`, `segmentId`, or a created-at range. Returns ' +
        '`{ items, nextCursor }`.',
      inputSchema: {
        environmentId: environmentIdSchema,
        email: z.string().optional().describe('Filter to a user with this email.'),
        companyId: z.string().optional().describe('Filter to users in this company.'),
        segmentId: z.string().optional().describe('Filter to users in this segment.'),
        ...createdAtRangeFields,
        limit: limitSchema,
        cursor: cursorSchema,
        orderBy: orderBySchema,
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const environment = await resolveEnvironment(args, ctx);
        const result = await ctx.services.users.list('mcp://users', environment, {
          limit: asLimit(args.limit),
          cursor: asString(args.cursor),
          orderBy: asOrderBy(args.orderBy),
          email: asString(args.email),
          companyId: asString(args.companyId),
          segmentId: asString(args.segmentId),
          createdAfter: asString(args.createdAfter),
          createdBefore: asString(args.createdBefore),
        });
        return toListPayload(result);
      },
    },

    {
      name: 'get_user',
      title: 'Get user',
      capability: Capability.UserRead,
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
        return ctx.services.users.getUser(id, environment.id, { expand: 'companies' });
      },
    },

    {
      name: 'list_themes',
      title: 'List themes',
      capability: Capability.ThemeRead,
      description:
        "List the project's themes (id, name, isDefault) — the theme ids accepted by a version's " +
        '`themeId`. Optionally filter by `name`. Bounded per-project set; returns `{ items }`.',
      inputSchema: {
        ...nameSearchField,
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const result = await ctx.services.themes.list('mcp://themes', ctx.projectId, {
          limit: 100,
          name: asString(args.name),
        });
        return { items: result.results };
      },
    },

    {
      name: 'list_content_versions',
      title: 'List content versions',
      capability: Capability.ContentRead,
      description:
        "List a content's versions (newest first). Returns `{ items, nextCursor }`; pass " +
        '`nextCursor` back as `cursor` to page.',
      inputSchema: {
        contentId: z.string().describe('The content id.'),
        limit: limitSchema,
        cursor: cursorSchema,
        orderBy: orderBySchema,
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const contentId = asString(args.contentId);
        if (!contentId) {
          throw new Error('`contentId` is required.');
        }
        const result = await ctx.services.contentVersions.list(
          'mcp://content-versions',
          ctx.projectId,
          contentId,
          {
            limit: asLimit(args.limit),
            cursor: asString(args.cursor),
            orderBy: asOrderBy(args.orderBy),
          },
        );
        return toListPayload(result);
      },
    },

    {
      name: 'get_content_version',
      title: 'Get a content version',
      capability: Capability.ContentRead,
      description:
        'Get a content version by id. `expand: ["steps"]` inlines the decompiled steps — read ' +
        'these before calling `update_content_version`. Also supports "data" and "questions".',
      inputSchema: {
        contentId: z.string().describe('The content id.'),
        id: z.string().describe('The content version id.'),
        expand: z
          .array(z.enum(['questions', 'steps', 'data']))
          .optional()
          .describe('Related data to inline: steps, data, questions.'),
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const contentId = asString(args.contentId);
        const id = asString(args.id);
        if (!contentId || !id) {
          throw new Error('`contentId` and `id` are required.');
        }
        return ctx.services.contentVersions.get(id, contentId, ctx.projectId, {
          expand: asStringArray(args.expand) as VersionExpand[] | undefined,
        });
      },
    },

    {
      name: 'validate_content_version',
      title: 'Validate a content version',
      capability: Capability.ContentRead,
      description:
        'Dry-run usability check for a draft version — the same rules `publish_content` enforces, ' +
        'without changing anything. Returns `{ ok, errors, warnings }`; `errors` are what would ' +
        'block publish (e.g. a tooltip step with no target, an empty checklist, no theme). Run ' +
        'this after authoring and before `publish_content`.',
      inputSchema: {
        contentId: z.string().describe('The content id.'),
        id: z.string().describe('The content version id.'),
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const contentId = asString(args.contentId);
        const id = asString(args.id);
        if (!contentId || !id) {
          throw new Error('`contentId` and `id` are required.');
        }
        return ctx.services.contentVersions.validate(id, contentId, ctx.projectId);
      },
    },

    {
      name: 'list_companies',
      title: 'List companies',
      capability: Capability.CompanyRead,
      description:
        'List companies in an environment. Defaults to the primary environment; pass ' +
        '`environmentId` to target another. Filter by `segmentId` or a created-at range. ' +
        'Returns `{ items, nextCursor }`.',
      inputSchema: {
        environmentId: environmentIdSchema,
        segmentId: z.string().optional().describe('Filter to companies in this segment.'),
        expand: z
          .array(z.enum(['users', 'memberships', 'memberships.user']))
          .optional()
          .describe('Inline users / memberships on each item (avoids per-item get).'),
        ...createdAtRangeFields,
        limit: limitSchema,
        cursor: cursorSchema,
        orderBy: orderBySchema,
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const environment = await resolveEnvironment(args, ctx);
        const result = await ctx.services.companies.list('mcp://companies', environment.id, {
          limit: asLimit(args.limit),
          cursor: asString(args.cursor),
          orderBy: asOrderBy(args.orderBy),
          segmentId: asString(args.segmentId),
          expand: asStringArray(args.expand) as CompanyExpand[] | undefined,
          createdAfter: asString(args.createdAfter),
          createdBefore: asString(args.createdBefore),
        });
        return toListPayload(result);
      },
    },

    {
      name: 'get_company',
      title: 'Get a company',
      capability: Capability.CompanyRead,
      description:
        'Get a company by its external id. `expand` inlines users / memberships. Defaults to the ' +
        'primary environment; pass `environmentId` to target another.',
      inputSchema: {
        id: z.string().describe('The company external id.'),
        environmentId: environmentIdSchema,
        expand: z
          .array(z.enum(['users', 'memberships', 'memberships.user']))
          .optional()
          .describe('Related objects to inline: users, memberships, memberships.user.'),
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const id = asString(args.id);
        if (!id) {
          throw new Error('`id` is required.');
        }
        const environment = await resolveEnvironment(args, ctx);
        return ctx.services.companies.getCompany(id, environment.id, {
          expand: asStringArray(args.expand) as CompanyExpand[] | undefined,
        });
      },
    },

    {
      name: 'list_segments',
      title: 'List segments',
      capability: Capability.SegmentRead,
      description:
        'List the project\'s segments. Filter by `name` or `bizType` ("user" or "company"). ' +
        'Returns `{ items, nextCursor }`.',
      inputSchema: {
        bizType: z
          .enum(['user', 'company'])
          .optional()
          .describe('Filter to user or company segments.'),
        ...nameSearchField,
        limit: limitSchema,
        cursor: cursorSchema,
        orderBy: orderBySchema,
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const result = await ctx.services.segments.list('mcp://segments', ctx.projectId, {
          limit: asLimit(args.limit),
          cursor: asString(args.cursor),
          orderBy: asOrderBy(args.orderBy),
          name: asString(args.name),
          bizType: asString(args.bizType) as 'user' | 'company' | undefined,
        });
        return toListPayload(result);
      },
    },

    {
      name: 'get_segment',
      title: 'Get a segment',
      capability: Capability.SegmentRead,
      description: 'Get a segment by id (condition segments inline their conditions).',
      inputSchema: { id: z.string().describe('The segment id.') },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const id = asString(args.id);
        if (!id) {
          throw new Error('`id` is required.');
        }
        return ctx.services.segments.get(id, ctx.projectId);
      },
    },

    {
      name: 'list_sessions',
      title: 'List sessions',
      capability: Capability.SessionRead,
      description:
        'List content sessions in an environment. Filter by `contentId`, `userId`, `completed`, ' +
        'or a created-at range. Defaults to the primary environment; pass `environmentId` to ' +
        'target another. Returns `{ items, nextCursor }`.',
      inputSchema: {
        environmentId: environmentIdSchema,
        contentId: z.string().optional().describe('Filter to a single content.'),
        userId: z.string().optional().describe('Filter to a single end-user (external id).'),
        completed: z
          .boolean()
          .optional()
          .describe('Filter to completed (true) or open (false) sessions.'),
        expand: z
          .array(z.enum(['answers', 'content', 'company', 'user', 'version']))
          .optional()
          .describe('Inline content / user / company / version / answers on each item.'),
        ...createdAtRangeFields,
        limit: limitSchema,
        cursor: cursorSchema,
        orderBy: orderBySchema,
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const environment = await resolveEnvironment(args, ctx);
        const result = await ctx.services.sessions.list('mcp://sessions', environment, {
          limit: asLimit(args.limit),
          cursor: asString(args.cursor),
          orderBy: asOrderBy(args.orderBy),
          contentId: asString(args.contentId),
          userId: asString(args.userId),
          completed: typeof args.completed === 'boolean' ? args.completed : undefined,
          expand: asStringArray(args.expand) as SessionExpand[] | undefined,
          createdAfter: asString(args.createdAfter),
          createdBefore: asString(args.createdBefore),
        });
        return toListPayload(result);
      },
    },

    {
      name: 'get_session',
      title: 'Get a session',
      capability: Capability.SessionRead,
      description:
        'Get a content session by id. `expand` inlines content / user / company / version / ' +
        'answers. Defaults to the primary environment; pass `environmentId` to target another.',
      inputSchema: {
        id: z.string().describe('The session id.'),
        environmentId: environmentIdSchema,
        expand: z
          .array(z.enum(['answers', 'content', 'company', 'user', 'version']))
          .optional()
          .describe('Related objects to inline: answers, content, company, user, version.'),
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const id = asString(args.id);
        if (!id) {
          throw new Error('`id` is required.');
        }
        const environment = await resolveEnvironment(args, ctx);
        return ctx.services.sessions.get(id, environment, {
          expand: asStringArray(args.expand) as SessionExpand[] | undefined,
        });
      },
    },

    {
      name: 'list_environments',
      title: 'List environments',
      capability: Capability.EnvironmentRead,
      description:
        "List the project's environments — the environment ids that the env-scoped tools and " +
        '`publish_content` accept (`isPrimary` marks the default). Optionally filter by `name`. ' +
        'Returns `{ items, nextCursor }`.',
      inputSchema: {
        ...nameSearchField,
        limit: limitSchema,
        cursor: cursorSchema,
        orderBy: orderBySchema,
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const result = await ctx.services.environments.list('mcp://environments', ctx.projectId, {
          limit: asLimit(args.limit),
          cursor: asString(args.cursor),
          orderBy: asOrderBy(args.orderBy),
          name: asString(args.name),
        });
        return toListPayload(result);
      },
    },

    {
      name: 'get_environment',
      title: 'Get an environment',
      capability: Capability.EnvironmentRead,
      description: 'Get a single environment by id.',
      inputSchema: { id: z.string().describe('The environment id.') },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const id = asString(args.id);
        if (!id) {
          throw new Error('`id` is required.');
        }
        return ctx.services.environments.get(id, ctx.projectId);
      },
    },
  ];
}
