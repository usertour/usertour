import { Capability, ContentDataType } from '@usertour/types';
import { Environment } from '@prisma/client';
import { z } from 'zod';

import { buildDecompileResolversFrom } from '@/api/content-representation/attribute-resolvers';
import { decompileConditions } from '@/api/content-representation/rules.decompile';

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
import { themeSettingsPatchSchema } from '@/api/themes/settings.schema';
import { ThemeExpand } from '@/api/themes/themes.schema';

import { McpTool, McpToolContext } from '../mcp.types';
import { READ_ONLY } from './annotations';
import { AUTHORING_GUIDE } from './authoring-guide';
import {
  annotateConditions,
  attachConditionNames,
  attachUserAttributeValues,
  buildDiagnoseReport,
  collectConditionRefs,
} from './diagnose-report';

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
  opts: { requireExplicit?: boolean } = {},
): Promise<Environment> {
  const environmentId = asString(args.environmentId);
  if (environmentId) {
    // Explicit target: resolve it, then enforce the token's environment scope (read or
    // write alike — a token may only act on the environments it was granted).
    const environment = await ctx.auth.resolveEnvironment(ctx.projectId, environmentId);
    ctx.auth.assertEnvironmentInScope(ctx.token, environment);
    return environment;
  }

  // No explicit env: pick a default WITHIN the token's allowed environments (null = all).
  const all = await ctx.prisma.environment.findMany({
    where: { projectId: ctx.projectId, deleted: false },
    orderBy: { createdAt: 'asc' },
  });
  const allowed = ctx.auth.allowedEnvironmentIds(ctx.token);
  const inScope = allowed ? all.filter((e) => allowed.includes(e.id)) : all;
  if (inScope.length === 0) {
    throw new Error(
      'No environment is available to this token for the project. Pass an explicit ' +
        '"environmentId" the token is scoped to.',
    );
  }
  // A token scoped to exactly one environment is unambiguous — default to it, even for
  // writes (no need to make a single-env agent restate its only environment every call).
  if (inScope.length === 1) {
    return inScope[0];
  }
  // Ambiguous: never silently pick an environment for a state-changing / outward operation
  // (defaulting would, e.g., publish to Production on the user's behalf). Require explicit.
  if (opts.requireExplicit) {
    const list = inScope.map((e) => `${e.name} (${e.id})`).join(', ');
    throw new Error(
      `This token may act on ${inScope.length} environments — refusing to choose one for a ` +
        `state-changing operation. Pass an explicit "environmentId". Available: ${list}.`,
    );
  }
  // Read default: the primary if it's in scope, else the first in-scope environment.
  return inScope.find((e) => e.isPrimary) ?? inScope[0];
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
// Strict variant for state-changing / outward write tools: a single-environment project
// still defaults, but a multi-environment project MUST pass this — the tool refuses to
// pick one for a publish/write (see resolveEnvironment requireExplicit).
export const environmentIdWriteSchema = z
  .string()
  .optional()
  .describe(
    'Environment to target. Single-environment projects default to that environment; if the ' +
      'project has MULTIPLE environments you MUST set this — a state-changing tool will not ' +
      'choose one for you (it errors and lists the available environments).',
  );

/**
 * Build the read-only MCP tool registry. Each tool is a thin binding over a v2
 * `src/api` service (the same contract the v2 REST endpoints expose) — content /
 * attribute / event are project-scoped; users are environment-scoped. Each
 * handler re-asserts its capability via `ctx.auth.authorize` (defense in depth;
 * registration is already scope-gated in McpService) and returns a plain
 * JSON-serializable payload. `inputSchema` is a zod raw shape the SDK validates.
 */
export function buildReadTools(): McpTool[] {
  const tools: McpTool[] = [
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
        // instead of throwing, so the discovery tool never fails. `reused: 'ref'`
        // hoists the shared sub-schemas (conditions / blocks / actions, referenced
        // many times) into `$defs` instead of re-inlining them — ~25% smaller.
        // `io: 'input'` advertises the WRITE shape: fields with a `.default()`
        // (e.g. a block's `object: 'block'`) are optional on input, so they must
        // not appear in `required` — otherwise the agent thinks it must send them.
        const toJson = (s: z.ZodType) =>
          z.toJSONSchema(s, { unrepresentable: 'any', reused: 'ref', io: 'input' });
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
        'List Usertour content (flow, checklist, launcher, banner, tracker, resource-center) in the ' +
        'project. Filter by `name`, `type`, `published`, or a created-at range. Returns ' +
        '`{ items, nextCursor }`; pass `nextCursor` back as `cursor` to page.',
      inputSchema: {
        ...nameSearchField,
        type: z
          .string()
          .optional()
          .describe(
            'Filter by content kind: flow, checklist, launcher, banner, tracker, or ' +
              'resource-center. (A "survey" is a flow with question blocks — not a separate kind.)',
          ),
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
        id: z
          .string()
          .optional()
          .describe('The content id. (Alias: `contentId`, matching the write tools.)'),
        contentId: z.string().optional().describe('Alias for `id` (matches the write tools).'),
        expand: z
          .array(z.enum(['editedVersion', 'publishedVersion']))
          .optional()
          .describe('Related objects to inline: editedVersion, publishedVersion.'),
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const id = asString(args.id) || asString(args.contentId);
        if (!id) {
          throw new Error('`id` (or `contentId`) is required.');
        }
        const expand = Array.isArray(args.expand)
          ? (args.expand.filter((e) => typeof e === 'string') as ContentExpand[])
          : undefined;
        return ctx.services.content.get(id, ctx.projectId, { expand });
      },
    },

    {
      name: 'diagnose_content',
      title: "Diagnose why content isn't showing",
      capability: Capability.ContentRead,
      annotations: READ_ONLY,
      description:
        'Answer "why isn\'t my content showing?" — the #1 targeting question. Returns a gate ' +
        'checklist (published / identified / start_rules / frequency / single_session / hidden / ' +
        'active_session), each gate evaluated by the SAME runtime function the websocket uses, plus ' +
        '`blockedBy` (the failing gates) and a one-line `summary`. For the two complex gates it ' +
        'expands the start/hide condition trees with each condition marked matched / unmatched / ' +
        'unknown so you can see exactly which branch failed. `unknown` = a live-only leaf (DOM ' +
        'element/text, or current_url when no `url` is passed) — confirm in the app. Pass `userId` ' +
        'to evaluate the per-user gates, `companyId` for company-scoped rules, `url` to test ' +
        'current_url conditions.',
      inputSchema: {
        contentId: z.string().describe('The content id.'),
        userId: z
          .string()
          .optional()
          .describe(
            'externalId of the end-user to diagnose for (omit for a structural-only check).',
          ),
        companyId: z
          .string()
          .optional()
          .describe('externalId of the company, for company-scoped segment/attribute rules.'),
        url: z
          .string()
          .optional()
          .describe(
            'A page URL to evaluate current_url conditions against (omit → reported as unknown).',
          ),
        environmentId: environmentIdSchema,
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const contentId = asString(args.contentId);
        if (!contentId) {
          throw new Error('`contentId` is required.');
        }
        const environment = await resolveEnvironment(args, ctx);
        const content = (await ctx.services.content.get(contentId, ctx.projectId, {})) as {
          type: string;
        };
        const url = asString(args.url);

        const facts = await ctx.contentDiagnosis.diagnose({
          environment,
          contentId,
          contentType: content.type as ContentDataType,
          externalUserId: asString(args.userId),
          externalCompanyId: asString(args.companyId),
          url,
        });

        // Name the competing sibling (the runtime carries only its content id) — either the
        // active-slot holder or the higher-priority outranker (mutually exclusive).
        const siblingId = facts.activeSlotHeldByContentId ?? facts.outrankedByContentId;
        if (siblingId) {
          const sibling = (await ctx.services.content
            .get(siblingId, ctx.projectId, {})
            .catch(() => null)) as { name?: string } | null;
          if (sibling?.name) {
            if (facts.activeSlotHeldByContentId) {
              facts.activeSlotHeldByName = sibling.name;
            } else {
              facts.outrankedByName = sibling.name;
            }
          }
        }

        // Render the stamped compiled conditions readable via the api-layer decompile
        // (attribute/event codes resolved; segment/content stay as ids per the v2
        // representation contract), then overlay status.
        let startConditions: ReturnType<typeof annotateConditions> | undefined;
        let hideConditions: ReturnType<typeof annotateConditions> | undefined;
        if (facts.autoStartRules || facts.hideRules) {
          const [attributes, events] = await Promise.all([
            ctx.prisma.attribute.findMany({
              where: { projectId: ctx.projectId },
              select: { id: true, codeName: true, bizType: true },
            }),
            ctx.prisma.event.findMany({
              where: { projectId: ctx.projectId },
              select: { id: true, codeName: true },
            }),
          ]);
          const resolvers = buildDecompileResolversFrom(attributes, events);
          const hasUrl = !!url;
          if (facts.autoStartRules) {
            startConditions = annotateConditions(
              facts.autoStartRules,
              decompileConditions(facts.autoStartRules, resolvers),
              hasUrl,
            );
          }
          if (facts.hideRules) {
            hideConditions = annotateConditions(
              facts.hideRules,
              decompileConditions(facts.hideRules, resolvers),
              hasUrl,
            );
          }

          // segment/content conditions decompile to ids per the representation contract;
          // resolve their names so the diagnosis reads without a follow-up lookup.
          const startRefs = collectConditionRefs(startConditions);
          const hideRefs = collectConditionRefs(hideConditions);
          const segmentIds = [...new Set([...startRefs.segmentIds, ...hideRefs.segmentIds])];
          const flowIds = [...new Set([...startRefs.flowIds, ...hideRefs.flowIds])];
          if (segmentIds.length || flowIds.length) {
            const [segments, contents] = await Promise.all([
              segmentIds.length
                ? ctx.prisma.segment.findMany({
                    where: { id: { in: segmentIds } },
                    select: { id: true, name: true },
                  })
                : Promise.resolve([]),
              flowIds.length
                ? ctx.prisma.content.findMany({
                    where: { id: { in: flowIds }, projectId: ctx.projectId },
                    select: { id: true, name: true },
                  })
                : Promise.resolve([]),
            ]);
            const nameById: Record<string, string> = {};
            for (const s of segments) if (s.name) nameById[s.id] = s.name;
            for (const c of contents) if (c.name) nameById[c.id] = c.name;
            attachConditionNames(startConditions, nameById);
            attachConditionNames(hideConditions, nameById);
          }

          // Show the user's ACTUAL value next to each user-scoped attribute condition so
          // an unmatched leaf is self-explanatory (no separate get_user + date math).
          if (facts.userAttributes) {
            attachUserAttributeValues(startConditions, facts.userAttributes);
            attachUserAttributeValues(hideConditions, facts.userAttributes);
          }
        }

        return buildDiagnoseReport(facts, startConditions, hideConditions);
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
      name: 'get_theme',
      title: 'Get theme',
      capability: Capability.ThemeRead,
      description:
        'Get a single theme by id. Pass `expand: ["settings"]` to read its ACTUAL stored style ' +
        'settings (colors, fonts, sizes, …) — what create_theme / update_theme persisted and ' +
        'derived (e.g. "Auto" colors resolved); read this to verify a theme you wrote. ' +
        '`expand: ["variations"]` for conditional variations. Base fields (id, name, isDefault) ' +
        'always return; settings/variations only when expanded. (get_theme_schema is the writable ' +
        'shape; this returns the actual values.)',
      inputSchema: {
        id: z.string().describe('The theme id (from list_themes).'),
        expand: z
          .array(z.enum(['settings', 'variations']))
          .optional()
          .describe('Related data to inline: settings (actual style values), variations.'),
      },
      async handler(args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        const id = asString(args.id);
        if (!id) {
          throw new Error('`id` is required.');
        }
        return ctx.services.themes.get(id, ctx.projectId, {
          expand: asStringArray(args.expand) as ThemeExpand[] | undefined,
        });
      },
    },

    {
      name: 'get_theme_schema',
      title: 'Get the theme settings write schema',
      capability: Capability.ThemeRead,
      description:
        'Return the JSON Schema of the writable theme `settings` — the fields you can pass to ' +
        'create_theme / update_theme and their ranges/enums. The tool exposes `settings` as a ' +
        'generic object, so fetch the shape here before theming. Settings is field-merged onto ' +
        'the current settings; "Auto" hover/active colors are derived server-side.',
      inputSchema: {},
      async handler(_args, ctx) {
        await ctx.auth.authorize(ctx.token, ctx.projectId, this.capability);
        // `unrepresentable: 'any'` degrades any non-JSON-Schema-able node to `{}`
        // instead of throwing, so the discovery tool never fails.
        // (No `reused: 'ref'` here — the generated settings leaves are distinct
        // schema objects, so there's nothing for zod to dedupe; it's a no-op.)
        return {
          body: 'settings',
          schema: z.toJSONSchema(themeSettingsPatchSchema, { unrepresentable: 'any' }),
        };
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
  return tools.map((tool) => ({ ...tool, annotations: READ_ONLY }));
}
