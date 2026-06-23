import { Capability } from '@usertour/types';
import { z } from 'zod';

import {
  createAttributeBody,
  type CreateAttributeBody,
  updateAttributeBody,
  type UpdateAttributeBody,
} from '@/api/attribute-definitions/attribute-definitions.schema';
import {
  upsertCompanyBody,
  type UpsertCompanyBody,
  upsertMembershipBody,
  type UpsertMembershipBody,
} from '@/api/companies/companies.schema';
import type { CreateContentBody } from '@/api/content/content.schema';
import {
  representationHideRules,
  representationStartRules,
  representationStepInput,
} from '@/api/content-representation/representation.schema';
import {
  createEnvironmentBody,
  type CreateEnvironmentBody,
  updateEnvironmentBody,
  type UpdateEnvironmentBody,
} from '@/api/environments/environments.schema';
import {
  createEventDefinitionBody,
  type CreateEventDefinitionBody,
  updateEventDefinitionBody,
  type UpdateEventDefinitionBody,
} from '@/api/event-definitions/event-definitions.schema';
import {
  createSegmentBody,
  type CreateSegmentBody,
  updateSegmentBody,
  type UpdateSegmentBody,
} from '@/api/segments/segments.schema';
import {
  createThemeBody,
  type CreateThemeBody,
  updateThemeBody,
  type UpdateThemeBody,
} from '@/api/themes/themes.schema';
import { upsertUserBody, type UpsertUserBody } from '@/api/users/users.schema';

import { McpTool } from '../mcp.types';
import { writeAnnotationsFor } from './annotations';
import { environmentIdSchema, resolveEnvironment } from './read-tools';
import { auditCreate, auditDelete, auditUpdate } from './audit-meta';

// Theme `settings` is exposed to MCP as a permissive object (its full ~136-field
// schema would bloat every tools/list); the agent fetches the exact fields/ranges
// via `get_theme_schema`, and the server validates strictly against the SSOT. Same
// pattern as `update_content_version`'s `data`.
const themeSettingsMcpField = z
  .record(z.string(), z.any())
  .optional()
  .describe(
    'Partial theme styling (colors / fonts / sizes). Call get_theme_schema for the exact ' +
      'writable fields and their ranges. Field-merged onto the current settings; "Auto" hover/' +
      'active colors are derived server-side.',
  );

/**
 * Write-side MCP tools — gated by content:create / content:update /
 * content:delete. They bind the same v2 write services the REST endpoints use
 * (compile + field-level merge + domain delegation); `run_javascript` is
 * rejected by the compiler, and version writes only touch editable drafts.
 */
export function buildWriteTools(): McpTool[] {
  const tools: McpTool[] = [
    {
      name: 'create_content',
      audit: auditCreate('content'),
      title: 'Create content',
      capability: Capability.ContentCreate,
      description:
        'Create a new piece of Usertour content (flow, checklist, launcher, banner, survey) in ' +
        'the project, with a draft version themed by `themeId`. Returns the created content (use ' +
        '`update_content_version` to add steps; use `list_themes` to pick a themeId).',
      inputSchema: {
        type: z
          .enum(['flow', 'checklist', 'launcher', 'banner', 'tracker', 'resource-center'])
          .describe('Content kind.'),
        name: z.string().optional(),
        buildUrl: z.string().optional(),
        themeId: z
          .string()
          .optional()
          .describe(
            'Theme for the initial draft version. Required for every type except `tracker` ' +
              '(no UI). Use `list_themes`; pick the one with isDefault if unsure.',
          ),
      },
      handler: (args, ctx) =>
        ctx.services.content.create(ctx.projectId, args as unknown as CreateContentBody),
    },
    {
      name: 'update_content',
      audit: auditUpdate('content', undefined, { idArg: 'contentId' }),
      title: 'Update content',
      capability: Capability.ContentUpdate,
      description: "Update a content's metadata (name / buildUrl).",
      inputSchema: {
        contentId: z.string(),
        name: z.string().optional(),
        buildUrl: z.string().optional(),
      },
      handler: (args, ctx) =>
        ctx.services.content.update(
          String(args.contentId),
          ctx.projectId,
          args as {
            name?: string;
            buildUrl?: string;
          },
        ),
    },
    {
      name: 'delete_content',
      audit: auditDelete('content', undefined, { idArg: 'contentId' }),
      title: 'Delete content',
      capability: Capability.ContentDelete,
      description: 'Delete a piece of content.',
      inputSchema: { contentId: z.string() },
      handler: async (args, ctx) => {
        await ctx.services.content.remove(String(args.contentId), ctx.projectId);
        return { success: true };
      },
    },
    {
      name: 'update_content_version',
      audit: auditUpdate('content', undefined, { idArg: 'contentId' }),
      title: 'Update a draft content version',
      capability: Capability.ContentUpdate,
      description:
        'Write steps and/or start/hide rules to a draft (editable) content version. `steps` is ' +
        'the COMPLETE step list, not a patch — any existing step you omit is deleted. Match a ' +
        'step to update by its `cvid` (stable across forks) or primary `id`; omit both to add a ' +
        'new one. Editing a published version fails with E0049 — fork it first with ' +
        'create_content_version. Text blocks use markdown, with `{{ attribute | default: "x" }}` ' +
        'for user attributes. Returns the updated version with its decompiled steps.',
      inputSchema: {
        contentId: z.string(),
        versionId: z.string(),
        steps: z.array(representationStepInput).optional(),
        startRules: representationStartRules.nullable().optional(),
        hideRules: representationHideRules.nullable().optional(),
        themeId: z.string().optional().describe('Theme to apply (cannot be cleared).'),
        data: z
          // A permissive object (not z.unknown) so the MCP client can actually
          // pass a nested body; its real per-type shape comes from
          // get_content_schema, and the server validates it against the type.
          .record(z.string(), z.any())
          .optional()
          .describe(
            'Type-specific body for non-flow content (checklist / launcher / banner / tracker / ' +
              'resource-center). Fetch its exact shape with get_content_schema. Top-level fields ' +
              'merge (omit one to leave it unchanged), but a list you DO send — e.g. checklist ' +
              '`items` — REPLACES that whole list, deleting omitted members (same as `steps`); ' +
              'a member is matched by its `id`. Validated against the content type.',
          ),
      },
      handler: (args, ctx) =>
        ctx.services.contentVersions.update(
          String(args.versionId),
          String(args.contentId),
          ctx.projectId,
          args as never,
        ),
    },
    {
      name: 'create_content_version',
      audit: auditUpdate('content', undefined, { idArg: 'contentId' }),
      title: 'Create a draft content version',
      capability: Capability.ContentUpdate,
      description:
        "Fork the content's current edited version into a new draft (the new editable version); " +
        'the previous draft is frozen as history. Use this to edit PUBLISHED/locked content: it ' +
        'copies the steps and data, and each step keeps its `cvid` (only the primary `id` is ' +
        'regenerated), so you can keep targeting steps by `cvid`/`key` without re-reading. ' +
        'Returns the new version.',
      inputSchema: { contentId: z.string() },
      handler: (args, ctx) =>
        ctx.services.contentVersions.create(ctx.projectId, String(args.contentId)),
    },
    {
      name: 'restore_content_version',
      audit: auditUpdate('content', undefined, { idArg: 'contentId' }),
      title: 'Restore a historical version',
      capability: Capability.ContentUpdate,
      description:
        'Restore a historical content version by forking it forward as the new draft (config / ' +
        'data / theme / steps copied from it). Returns the new version.',
      inputSchema: { contentId: z.string(), versionId: z.string() },
      handler: (args, ctx) =>
        ctx.services.contentVersions.restore(
          String(args.versionId),
          String(args.contentId),
          ctx.projectId,
        ),
    },
    {
      name: 'duplicate_content',
      audit: auditCreate('content'),
      title: 'Duplicate content',
      capability: Capability.ContentCreate,
      description:
        'Duplicate a piece of content into a fresh content (copies the edited version). ' +
        'Optionally set a `name` and a target `environmentId`. Returns the new content.',
      inputSchema: {
        contentId: z.string(),
        name: z.string().optional(),
        environmentId: z.string().optional(),
      },
      handler: (args, ctx) =>
        ctx.services.content.duplicate(String(args.contentId), ctx.projectId, {
          name: args.name as string | undefined,
          environmentId: args.environmentId as string | undefined,
        }),
    },
    {
      name: 'publish_content',
      audit: auditUpdate('content', undefined, { envScoped: true, idArg: 'contentId' }),
      title: 'Publish a version to an environment',
      capability: Capability.ContentPublish,
      description:
        "Publish a version as an environment's live version (idempotent). Defaults to the " +
        'primary environment; pass `environmentId` to target another. Returns the content with ' +
        'refreshed `environments[]`.',
      inputSchema: {
        contentId: z.string(),
        versionId: z.string(),
        environmentId: z
          .string()
          .optional()
          .describe('Environment to publish to (defaults to the primary environment).'),
      },
      handler: async (args, ctx) => {
        const environment = await resolveEnvironment(args, ctx);
        return ctx.services.content.publish(
          String(args.contentId),
          ctx.projectId,
          environment.id,
          String(args.versionId),
        );
      },
    },
    {
      name: 'unpublish_content',
      audit: auditUpdate('content', undefined, { envScoped: true, idArg: 'contentId' }),
      title: 'Unpublish content from an environment',
      capability: Capability.ContentPublish,
      description:
        "Clear an environment's live version for a content. Defaults to the primary environment; " +
        'pass `environmentId` to target another. Returns the content with refreshed `environments[]`.',
      inputSchema: {
        contentId: z.string(),
        environmentId: z
          .string()
          .optional()
          .describe('Environment to unpublish from (defaults to the primary environment).'),
      },
      handler: async (args, ctx) => {
        const environment = await resolveEnvironment(args, ctx);
        return ctx.services.content.unpublish(
          String(args.contentId),
          ctx.projectId,
          environment.id,
        );
      },
    },

    // ---- Users (env-level, client-keyed) ----
    {
      name: 'upsert_user',
      audit: auditUpdate('user', undefined, { envScoped: true }),
      title: 'Create or update a user',
      capability: Capability.UserWrite,
      description:
        'Create or update an end-user by external id (idempotent). Attributes merge into the ' +
        'existing ones. Defaults to the primary environment; pass `environmentId` to target another.',
      inputSchema: {
        id: z.string().describe('The user external id.'),
        environmentId: environmentIdSchema,
        ...upsertUserBody.shape,
      },
      handler: async (args, ctx) =>
        ctx.services.users.upsert(
          String(args.id),
          await resolveEnvironment(args, ctx),
          args as unknown as UpsertUserBody,
        ),
    },
    {
      name: 'delete_user',
      audit: auditDelete(
        'user',
        (args, ctx, env) =>
          ctx.prisma.bizUser.findFirst({
            where: { externalId: String(args.id), environmentId: env?.id },
          }),
        { envScoped: true },
      ),
      title: 'Delete a user',
      capability: Capability.UserDelete,
      description:
        'Delete an end-user by external id. Defaults to the primary environment; pass ' +
        '`environmentId` to target another.',
      inputSchema: {
        id: z.string().describe('The user external id.'),
        environmentId: environmentIdSchema,
      },
      handler: async (args, ctx) => {
        await ctx.services.users.delete(String(args.id), await resolveEnvironment(args, ctx));
        return { success: true };
      },
    },

    // ---- Companies (env-level, client-keyed) ----
    {
      name: 'upsert_company',
      audit: auditUpdate('company', undefined, { envScoped: true }),
      title: 'Create or update a company',
      capability: Capability.CompanyWrite,
      description:
        'Create or update a company by external id (idempotent). Attributes merge into the ' +
        'existing ones. Defaults to the primary environment; pass `environmentId` to target another.',
      inputSchema: {
        id: z.string().describe('The company external id.'),
        environmentId: environmentIdSchema,
        ...upsertCompanyBody.shape,
      },
      handler: async (args, ctx) =>
        ctx.services.companies.upsert(
          String(args.id),
          await resolveEnvironment(args, ctx),
          args as unknown as UpsertCompanyBody,
        ),
    },
    {
      name: 'delete_company',
      audit: auditDelete(
        'company',
        (args, ctx, env) =>
          ctx.prisma.bizCompany.findFirst({
            where: { externalId: String(args.id), environmentId: env?.id },
          }),
        { envScoped: true },
      ),
      title: 'Delete a company',
      capability: Capability.CompanyDelete,
      description:
        'Delete a company by external id. Defaults to the primary environment; pass ' +
        '`environmentId` to target another.',
      inputSchema: {
        id: z.string().describe('The company external id.'),
        environmentId: environmentIdSchema,
      },
      handler: async (args, ctx) => {
        await ctx.services.companies.delete(String(args.id), await resolveEnvironment(args, ctx));
        return { success: true };
      },
    },
    {
      name: 'add_company_member',
      audit: {
        action: 'update',
        resourceType: 'companyMember',
        envScoped: true,
        resourceId: (args) => `${String(args.userId)}:${String(args.companyId)}`,
      },
      title: 'Add a user to a company',
      capability: Capability.CompanyWrite,
      description:
        'Add a user to a company, or update the membership (idempotent). Optional membership ' +
        'attributes merge. Defaults to the primary environment; pass `environmentId` to target another.',
      inputSchema: {
        companyId: z.string().describe('The company external id.'),
        userId: z.string().describe('The user external id.'),
        environmentId: environmentIdSchema,
        ...upsertMembershipBody.shape,
      },
      handler: async (args, ctx) => {
        await ctx.services.companies.upsertMembership(
          String(args.companyId),
          String(args.userId),
          await resolveEnvironment(args, ctx),
          args as unknown as UpsertMembershipBody,
        );
        return { success: true };
      },
    },
    {
      name: 'remove_company_member',
      audit: {
        action: 'delete',
        resourceType: 'companyMember',
        envScoped: true,
        resourceId: (args) => `${String(args.userId)}:${String(args.companyId)}`,
      },
      title: 'Remove a user from a company',
      capability: Capability.CompanyWrite,
      description:
        'Remove a user from a company. Defaults to the primary environment; pass `environmentId` ' +
        'to target another.',
      inputSchema: {
        companyId: z.string().describe('The company external id.'),
        userId: z.string().describe('The user external id.'),
        environmentId: environmentIdSchema,
      },
      handler: async (args, ctx) => {
        await ctx.services.companies.deleteMembership(
          String(args.companyId),
          String(args.userId),
          await resolveEnvironment(args, ctx),
        );
        return { success: true };
      },
    },

    // ---- Segments (definitions project-level; membership env-level) ----
    {
      name: 'create_segment',
      audit: auditCreate('segment'),
      title: 'Create a segment',
      capability: Capability.SegmentCreate,
      description:
        'Create a user or company segment. `kind: manual` holds an explicit member list; ' +
        '`kind: condition` carries membership conditions.',
      inputSchema: { ...createSegmentBody.shape },
      handler: (args, ctx) =>
        ctx.services.segments.create(ctx.projectId, args as unknown as CreateSegmentBody),
    },
    {
      name: 'update_segment',
      audit: auditUpdate('segment', (args, ctx) =>
        ctx.prisma.segment.findUnique({ where: { id: String(args.id) } }),
      ),
      title: 'Update a segment',
      capability: Capability.SegmentUpdate,
      description: "Update a segment's name, or replace a condition segment's conditions.",
      inputSchema: { id: z.string().describe('The segment id.'), ...updateSegmentBody.shape },
      handler: (args, ctx) =>
        ctx.services.segments.update(
          String(args.id),
          ctx.projectId,
          args as unknown as UpdateSegmentBody,
        ),
    },
    {
      name: 'delete_segment',
      audit: auditDelete('segment', (args, ctx) =>
        ctx.prisma.segment.findUnique({ where: { id: String(args.id) } }),
      ),
      title: 'Delete a segment',
      capability: Capability.SegmentDelete,
      description: 'Delete a segment.',
      inputSchema: { id: z.string().describe('The segment id.') },
      handler: async (args, ctx) => {
        await ctx.services.segments.delete(String(args.id), ctx.projectId);
        return { success: true };
      },
    },
    {
      name: 'add_segment_member',
      audit: {
        action: 'update',
        resourceType: 'segmentMember',
        envScoped: true,
        resourceId: (args) => `${String(args.id)}:${String(args.externalId)}`,
      },
      title: 'Add a member to a manual segment',
      capability: Capability.SegmentUpdate,
      description:
        'Add a user or company (per the segment bizType) to a manual segment. Defaults to the ' +
        'primary environment; pass `environmentId` to target another.',
      inputSchema: {
        id: z.string().describe('The segment id.'),
        externalId: z.string().describe('User or company external id (per segment bizType).'),
        environmentId: environmentIdSchema,
      },
      handler: async (args, ctx) => {
        const environment = await resolveEnvironment(args, ctx);
        await ctx.services.segments.addMember(
          String(args.id),
          ctx.projectId,
          environment.id,
          String(args.externalId),
        );
        return { success: true };
      },
    },
    {
      name: 'remove_segment_member',
      audit: {
        action: 'delete',
        resourceType: 'segmentMember',
        envScoped: true,
        resourceId: (args) => `${String(args.id)}:${String(args.externalId)}`,
      },
      title: 'Remove a member from a manual segment',
      capability: Capability.SegmentUpdate,
      description:
        'Remove a user or company from a manual segment. Defaults to the primary environment; ' +
        'pass `environmentId` to target another.',
      inputSchema: {
        id: z.string().describe('The segment id.'),
        externalId: z.string().describe('User or company external id (per segment bizType).'),
        environmentId: environmentIdSchema,
      },
      handler: async (args, ctx) => {
        const environment = await resolveEnvironment(args, ctx);
        await ctx.services.segments.removeMember(
          String(args.id),
          ctx.projectId,
          environment.id,
          String(args.externalId),
        );
        return { success: true };
      },
    },

    // ---- Themes (project-level) ----
    {
      name: 'create_theme',
      audit: auditCreate('theme'),
      title: 'Create a theme',
      capability: Capability.ThemeCreate,
      description:
        'Create a theme. Starts from the default styling; pass a partial `settings` to ' +
        'override colors / fonts / sizes (field-merged, auto colors derived). `variations` ' +
        'are not yet editable via the API.',
      inputSchema: { ...createThemeBody.shape, settings: themeSettingsMcpField },
      handler: (args, ctx) =>
        ctx.services.themes.create(ctx.projectId, args as unknown as CreateThemeBody),
    },
    {
      name: 'update_theme',
      audit: auditUpdate('theme', (args, ctx) =>
        ctx.prisma.theme.findUnique({ where: { id: String(args.id) } }),
      ),
      title: 'Update a theme',
      capability: Capability.ThemeUpdate,
      description:
        "Update a theme's metadata (name / isDefault) and/or `settings` (a partial style " +
        'patch, field-merged onto the current settings with auto colors derived). ' +
        '`variations` are not yet editable via the API.',
      inputSchema: {
        id: z.string().describe('The theme id.'),
        ...updateThemeBody.shape,
        settings: themeSettingsMcpField,
      },
      handler: (args, ctx) =>
        ctx.services.themes.update(
          String(args.id),
          ctx.projectId,
          args as unknown as UpdateThemeBody,
        ),
    },
    {
      name: 'delete_theme',
      audit: auditDelete('theme', (args, ctx) =>
        ctx.prisma.theme.findUnique({ where: { id: String(args.id) } }),
      ),
      title: 'Delete a theme',
      capability: Capability.ThemeDelete,
      description: 'Delete a theme. The project default theme cannot be deleted.',
      inputSchema: { id: z.string().describe('The theme id.') },
      handler: async (args, ctx) => {
        await ctx.services.themes.delete(String(args.id), ctx.projectId);
        return { success: true };
      },
    },

    // ---- Attribute definitions (project-level) ----
    {
      name: 'create_attribute_definition',
      audit: auditCreate('attribute'),
      title: 'Create an attribute definition',
      capability: Capability.AttributeCreate,
      description:
        'Define a custom attribute on user / company / companyMembership. codeName is immutable.',
      inputSchema: { ...createAttributeBody.shape },
      handler: (args, ctx) =>
        ctx.services.attributeDefinitions.create(
          ctx.projectId,
          args as unknown as CreateAttributeBody,
        ),
    },
    {
      name: 'update_attribute_definition',
      audit: auditUpdate('attribute', (args, ctx) =>
        ctx.prisma.attribute.findUnique({ where: { id: String(args.id) } }),
      ),
      title: 'Update an attribute definition',
      capability: Capability.AttributeUpdate,
      description: 'Update an attribute definition (displayName / description; codeName is fixed).',
      inputSchema: { id: z.string().describe('The attribute id.'), ...updateAttributeBody.shape },
      handler: (args, ctx) =>
        ctx.services.attributeDefinitions.update(
          String(args.id),
          ctx.projectId,
          args as unknown as UpdateAttributeBody,
        ),
    },
    {
      name: 'delete_attribute_definition',
      audit: auditDelete('attribute', (args, ctx) =>
        ctx.prisma.attribute.findUnique({ where: { id: String(args.id) } }),
      ),
      title: 'Delete an attribute definition',
      capability: Capability.AttributeDelete,
      description: 'Delete an attribute definition.',
      inputSchema: { id: z.string().describe('The attribute id.') },
      handler: async (args, ctx) => {
        await ctx.services.attributeDefinitions.delete(String(args.id), ctx.projectId);
        return { success: true };
      },
    },

    // ---- Event definitions (project-level) ----
    {
      name: 'create_event_definition',
      audit: auditCreate('event'),
      title: 'Create an event definition',
      capability: Capability.EventCreate,
      description: 'Define a custom event. codeName is immutable.',
      inputSchema: { ...createEventDefinitionBody.shape },
      handler: (args, ctx) =>
        ctx.services.eventDefinitions.create(
          ctx.projectId,
          args as unknown as CreateEventDefinitionBody,
        ),
    },
    {
      name: 'update_event_definition',
      audit: auditUpdate('event', (args, ctx) =>
        ctx.prisma.event.findUnique({ where: { id: String(args.id) } }),
      ),
      title: 'Update an event definition',
      capability: Capability.EventUpdate,
      description: 'Update an event definition (displayName / description; codeName is fixed).',
      inputSchema: {
        id: z.string().describe('The event id.'),
        ...updateEventDefinitionBody.shape,
      },
      handler: (args, ctx) =>
        ctx.services.eventDefinitions.update(
          String(args.id),
          ctx.projectId,
          args as unknown as UpdateEventDefinitionBody,
        ),
    },
    {
      name: 'delete_event_definition',
      audit: auditDelete('event', (args, ctx) =>
        ctx.prisma.event.findUnique({ where: { id: String(args.id) } }),
      ),
      title: 'Delete an event definition',
      capability: Capability.EventDelete,
      description: 'Delete an event definition.',
      inputSchema: { id: z.string().describe('The event id.') },
      handler: async (args, ctx) => {
        await ctx.services.eventDefinitions.delete(String(args.id), ctx.projectId);
        return { success: true };
      },
    },

    // ---- Sessions (env-level; session:manage) ----
    {
      name: 'end_session',
      audit: auditUpdate('session', undefined, { envScoped: true }),
      title: 'End a session',
      capability: Capability.SessionManage,
      description:
        'End an in-progress session. Defaults to the primary environment; pass `environmentId` ' +
        'to target another. Returns the completed session.',
      inputSchema: {
        id: z.string().describe('The session id.'),
        environmentId: environmentIdSchema,
      },
      handler: async (args, ctx) =>
        ctx.services.sessions.end(String(args.id), await resolveEnvironment(args, ctx)),
    },
    {
      name: 'delete_session',
      audit: auditDelete(
        'session',
        (args, ctx) => ctx.prisma.bizSession.findUnique({ where: { id: String(args.id) } }),
        { envScoped: true },
      ),
      title: 'Delete a session',
      capability: Capability.SessionManage,
      description:
        'Delete a session. Defaults to the primary environment; pass `environmentId` to target another.',
      inputSchema: {
        id: z.string().describe('The session id.'),
        environmentId: environmentIdSchema,
      },
      handler: async (args, ctx) => {
        await ctx.services.sessions.delete(String(args.id), await resolveEnvironment(args, ctx));
        return { success: true };
      },
    },

    // ---- Environments (project-level; environment:manage) ----
    {
      name: 'create_environment',
      audit: auditCreate('environment'),
      title: 'Create an environment',
      capability: Capability.EnvironmentManage,
      description: 'Create an environment in the project. The first one is made primary.',
      inputSchema: { ...createEnvironmentBody.shape },
      handler: (args, ctx) =>
        ctx.services.environments.create(ctx.projectId, args as unknown as CreateEnvironmentBody),
    },
    {
      name: 'update_environment',
      audit: auditUpdate('environment', undefined),
      title: 'Update an environment',
      capability: Capability.EnvironmentManage,
      description: 'Rename an environment.',
      inputSchema: {
        id: z.string().describe('The environment id.'),
        ...updateEnvironmentBody.shape,
      },
      handler: (args, ctx) =>
        ctx.services.environments.update(
          String(args.id),
          ctx.projectId,
          args as unknown as UpdateEnvironmentBody,
        ),
    },
    {
      name: 'delete_environment',
      audit: auditDelete('environment', undefined),
      title: 'Delete an environment',
      capability: Capability.EnvironmentManage,
      description: 'Delete an environment. The primary / last environment cannot be deleted.',
      inputSchema: { id: z.string().describe('The environment id.') },
      handler: async (args, ctx) => {
        await ctx.services.environments.delete(String(args.id), ctx.projectId);
        return { success: true };
      },
    },
  ];
  return tools.map((tool) => ({ ...tool, annotations: writeAnnotationsFor(tool.name) }));
}
