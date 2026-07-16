import { Capability } from '@usertour/types';
import { z } from 'zod';

import { createWebhookBody, updateWebhookBody } from '@/api/webhooks/webhooks.schema';
import { McpTool, McpToolContext } from '../mcp.types';
import { environmentIdSchema, resolveEnvironment } from './read-tools';

const MCP_LIST_URL = 'mcp://webhooks';

const cursorFromUrl = (url: string | null): string | null => {
  if (!url) {
    return null;
  }
  try {
    return new URL(url).searchParams.get('cursor');
  } catch {
    return null;
  }
};

/**
 * Webhook management tools (ADR 0010 M2). Bound to the same
 * {@link ApiWebhooksService} the REST surface uses, so validation (egress
 * guard, topic grammar) and the secret lifecycle are identical. The list tool
 * omits secrets (they'd land in agent context); create returns the secret once
 * so the agent can hand it to the user's receiver setup.
 */
export function buildWebhookTools(): McpTool[] {
  return [
    {
      name: 'list_webhooks',
      title: 'List webhooks',
      description:
        'List the outbound webhook endpoints configured for an environment. Signing secrets are ' +
        'not included — read one via the REST API or the dashboard.',
      capability: Capability.WebhookRead,
      inputSchema: {
        environmentId: environmentIdSchema,
        limit: z.number().int().min(1).max(100).optional().describe('Page size (default 20).'),
        cursor: z.string().optional().describe('Pagination cursor from a prior nextCursor.'),
      },
      annotations: { readOnlyHint: true },
      handler: async (args: Record<string, unknown>, ctx: McpToolContext) => {
        const environment = await resolveEnvironment(args, ctx);
        const result = await ctx.services.webhooks.list(MCP_LIST_URL, environment, {
          limit: (args.limit as number | undefined) ?? 20,
          cursor: args.cursor as string | undefined,
        });
        return { items: result.results, nextCursor: cursorFromUrl(result.next) };
      },
    },
    {
      name: 'create_webhook',
      title: 'Create a webhook',
      description:
        'Create an outbound webhook endpoint. Events matching the topic subscriptions are ' +
        'POSTed to the URL, signed with the returned whsec_ secret (shown here once — store it).',
      capability: Capability.WebhookManage,
      inputSchema: {
        environmentId: environmentIdSchema,
        ...createWebhookBody.shape,
      },
      audit: {
        action: 'create',
        resourceType: 'webhook',
        envScoped: true,
        resourceId: (_args, result) => (result as { id: string }).id,
      },
      handler: async (args: Record<string, unknown>, ctx: McpToolContext) => {
        const environment = await resolveEnvironment(args, ctx);
        const body = createWebhookBody.parse(args);
        return ctx.services.webhooks.create(environment, body);
      },
    },
    {
      name: 'update_webhook',
      title: 'Update a webhook',
      description:
        'Update an outbound webhook endpoint (URL, topic subscriptions, enabled, description).',
      capability: Capability.WebhookManage,
      inputSchema: {
        environmentId: environmentIdSchema,
        id: z.string().describe('Webhook ID.'),
        ...updateWebhookBody.shape,
      },
      audit: {
        action: 'update',
        resourceType: 'webhook',
        envScoped: true,
        resourceId: (args) => String(args.id),
        fetchBefore: (args, ctx) =>
          ctx.prisma.webhook.findUnique({ where: { id: String(args.id) } }),
      },
      handler: async (args: Record<string, unknown>, ctx: McpToolContext) => {
        const environment = await resolveEnvironment(args, ctx);
        const body = updateWebhookBody.parse(args);
        return ctx.services.webhooks.update(String(args.id), environment, body);
      },
    },
    {
      name: 'delete_webhook',
      title: 'Delete a webhook',
      description: 'Delete an outbound webhook endpoint and its delivery log.',
      capability: Capability.WebhookManage,
      inputSchema: {
        environmentId: environmentIdSchema,
        id: z.string().describe('Webhook ID.'),
      },
      annotations: { destructiveHint: true },
      audit: {
        action: 'delete',
        resourceType: 'webhook',
        envScoped: true,
        resourceId: (args) => String(args.id),
        fetchBefore: (args, ctx) =>
          ctx.prisma.webhook.findUnique({ where: { id: String(args.id) } }),
      },
      handler: async (args: Record<string, unknown>, ctx: McpToolContext) => {
        const environment = await resolveEnvironment(args, ctx);
        await ctx.services.webhooks.delete(String(args.id), environment);
        return { deleted: true, id: args.id };
      },
    },
  ];
}
