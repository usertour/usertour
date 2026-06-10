import { Capability } from '@usertour/types';
import { z } from 'zod';

import {
  representationHideRules,
  representationStartRules,
  representationStepInput,
} from '@/api/content-representation/representation.schema';

import { McpTool } from '../mcp.types';
import { resolveEnvironment } from './read-tools';

/**
 * Write-side MCP tools — gated by content:create / content:update /
 * content:delete. They bind the same v2 write services the REST endpoints use
 * (compile + field-level merge + domain delegation); `run_javascript` is
 * rejected by the compiler, and version writes only touch editable drafts.
 */
export function buildWriteTools(): McpTool[] {
  return [
    {
      name: 'create_content',
      title: 'Create content',
      capability: Capability.ContentCreate,
      description:
        'Create a new piece of Usertour content (flow, checklist, launcher, banner, survey) in ' +
        'the project, with an empty draft version. Returns the created content (use ' +
        '`update_content_version` to add steps).',
      inputSchema: {
        type: z.string().describe('Content kind: flow, checklist, launcher, banner, survey.'),
        name: z.string().optional(),
        buildUrl: z.string().optional(),
      },
      handler: (args, ctx) =>
        ctx.services.content.create(
          ctx.projectId,
          args as { type: string; name?: string; buildUrl?: string },
        ),
    },
    {
      name: 'update_content',
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
      title: 'Update a draft content version',
      capability: Capability.ContentUpdate,
      description:
        'Write steps and/or start/hide rules to a draft (editable) content version. `steps` ' +
        'replaces the version step list, merged by `cvid` (omit cvid to add a new step). Text ' +
        'blocks use markdown, with `{{ attribute | default: "x" }}` for user attributes. ' +
        'Returns the updated version with its decompiled steps.',
      inputSchema: {
        versionId: z.string(),
        steps: z.array(representationStepInput).optional(),
        startRules: representationStartRules.nullable().optional(),
        hideRules: representationHideRules.nullable().optional(),
        themeId: z.string().nullable().optional().describe('Theme to apply, or null to clear.'),
        data: z
          .unknown()
          .optional()
          .describe(
            'Type-specific body for non-flow content (checklist / launcher / banner / tracker / ' +
              'resource-center). Validated against the content type.',
          ),
      },
      handler: (args, ctx) =>
        ctx.services.contentVersions.update(String(args.versionId), ctx.projectId, args as never),
    },
    {
      name: 'create_content_version',
      title: 'Create a draft content version',
      capability: Capability.ContentUpdate,
      description:
        "Fork the content's current edited version into a new draft (the new editable version); " +
        'the previous draft is frozen as history. Returns the new version.',
      inputSchema: { contentId: z.string() },
      handler: (args, ctx) =>
        ctx.services.contentVersions.create(ctx.projectId, { contentId: String(args.contentId) }),
    },
    {
      name: 'publish_content',
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
  ];
}
