import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import { AuditWeb } from '@/modules/audit/decorators/audit.decorator';
import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { RequirePermission } from '@/modules/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/modules/auth/permission/scope-resolver.registry';
import { PaginationArgs } from '@/modules/common/dtos/pagination.args';
import { CreateWebhookInput } from './dtos/create-webhook.input';
import { QueryWebhooksInput } from './dtos/query-webhooks.input';
import { UpdateWebhookInput } from './dtos/update-webhook.input';
import { WebhookIdInput } from './dtos/webhook-id.input';
import { WebhookMessageInput } from './dtos/webhook-message.input';
import { WebhookMessageDTO } from './dtos/webhook-message.dto';
import { WebhookMessageConnectionDTO } from './dtos/webhook-message-connection.dto';
import { WebhookDTO } from './dtos/webhook.dto';
import { WebhooksService } from './services/webhooks.service';

@Resolver(() => WebhookDTO)
@UseGuards(PermissionGuard)
export class WebhooksResolver {
  constructor(private service: WebhooksService) {}

  @Query(() => [WebhookDTO])
  @RequirePermission({ capability: Capability.WebhookRead, scope: ScopeKind.Webhook })
  async listWebhooks(@Args() { environmentId }: QueryWebhooksInput) {
    return await this.service.list(environmentId);
  }

  @Query(() => WebhookDTO)
  @RequirePermission({ capability: Capability.WebhookRead, scope: ScopeKind.Webhook })
  async getWebhook(@Args('id') id: string) {
    return await this.service.get(id);
  }

  @Query(() => WebhookMessageConnectionDTO)
  @RequirePermission({ capability: Capability.WebhookRead, scope: ScopeKind.Webhook })
  async queryWebhookMessages(
    @Args('webhookId') webhookId: string,
    @Args() pagination: PaginationArgs,
  ) {
    return await this.service.listMessages(webhookId, pagination);
  }

  @Mutation(() => WebhookDTO)
  @RequirePermission({ capability: Capability.WebhookManage, scope: ScopeKind.Webhook })
  @AuditWeb({
    action: 'create',
    resourceType: 'webhook',
    resourceId: (_a, r) => (r as { id: string }).id,
    environmentId: (a) => (a.data as { environmentId: string }).environmentId,
  })
  async createWebhook(@Args('data') data: CreateWebhookInput) {
    return await this.service.create(data);
  }

  @Mutation(() => WebhookDTO)
  @RequirePermission({ capability: Capability.WebhookManage, scope: ScopeKind.Webhook })
  @AuditWeb({
    action: 'update',
    resourceType: 'webhook',
    resourceId: (a) => (a.data as { id: string }).id,
    environmentId: (_a, r) => (r as { environmentId: string } | undefined)?.environmentId,
  })
  async updateWebhook(@Args('data') data: UpdateWebhookInput) {
    return await this.service.update(data);
  }

  @Mutation(() => WebhookDTO)
  @RequirePermission({ capability: Capability.WebhookManage, scope: ScopeKind.Webhook })
  @AuditWeb({
    action: 'delete',
    resourceType: 'webhook',
    resourceId: (a) => (a.data as { id: string }).id,
    environmentId: (_a, r) => (r as { environmentId: string } | undefined)?.environmentId,
  })
  async deleteWebhook(@Args('data') { id }: WebhookIdInput) {
    return await this.service.delete(id);
  }

  @Mutation(() => WebhookDTO)
  @RequirePermission({ capability: Capability.WebhookManage, scope: ScopeKind.Webhook })
  @AuditWeb({
    action: 'update',
    resourceType: 'webhook',
    resourceId: (a) => (a.data as { id: string }).id,
    environmentId: (_a, r) => (r as { environmentId: string } | undefined)?.environmentId,
  })
  async rotateWebhookSecret(@Args('data') { id }: WebhookIdInput) {
    return await this.service.rotateSecret(id);
  }

  // Not audited: a test message mutates nothing — the delivery log records it.
  @Mutation(() => WebhookDTO)
  @RequirePermission({ capability: Capability.WebhookManage, scope: ScopeKind.Webhook })
  async sendWebhookTestEvent(@Args('data') { id }: WebhookIdInput) {
    return await this.service.sendTestEvent(id);
  }

  // Not audited for the same reason: re-sending changes no configuration.
  @Mutation(() => WebhookMessageDTO)
  @RequirePermission({ capability: Capability.WebhookManage, scope: ScopeKind.Webhook })
  async resendWebhookMessage(@Args('data') { webhookId, messageId }: WebhookMessageInput) {
    return await this.service.resendMessage(webhookId, messageId);
  }
}
