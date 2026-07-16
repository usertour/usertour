import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import { AuditWeb } from '@/audit/audit.decorator';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import {
  CreateWebhookInput,
  QueryWebhooksInput,
  UpdateWebhookInput,
  WebhookIdInput,
} from './dto/webhook.input';
import { WebhookDeliveryConnection } from './models/webhook-delivery.model';
import { Webhook } from './models/webhook.model';
import { WebhooksService } from './webhooks.service';

@Resolver(() => Webhook)
@UseGuards(PermissionGuard)
export class WebhooksResolver {
  constructor(private service: WebhooksService) {}

  @Query(() => [Webhook])
  @RequirePermission({ capability: Capability.WebhookRead, scope: ScopeKind.Webhook })
  async listWebhooks(@Args() { environmentId }: QueryWebhooksInput) {
    return await this.service.list(environmentId);
  }

  @Query(() => Webhook)
  @RequirePermission({ capability: Capability.WebhookRead, scope: ScopeKind.Webhook })
  async getWebhook(@Args('id') id: string) {
    return await this.service.get(id);
  }

  @Query(() => WebhookDeliveryConnection)
  @RequirePermission({ capability: Capability.WebhookRead, scope: ScopeKind.Webhook })
  async queryWebhookDeliveries(
    @Args('webhookId') webhookId: string,
    @Args() pagination: PaginationArgs,
  ) {
    return await this.service.listDeliveries(webhookId, pagination);
  }

  @Mutation(() => Webhook)
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

  @Mutation(() => Webhook)
  @RequirePermission({ capability: Capability.WebhookManage, scope: ScopeKind.Webhook })
  @AuditWeb({
    action: 'update',
    resourceType: 'webhook',
    resourceId: (a) => (a.data as { id: string }).id,
  })
  async updateWebhook(@Args('data') data: UpdateWebhookInput) {
    return await this.service.update(data);
  }

  @Mutation(() => Webhook)
  @RequirePermission({ capability: Capability.WebhookManage, scope: ScopeKind.Webhook })
  @AuditWeb({
    action: 'delete',
    resourceType: 'webhook',
    resourceId: (a) => (a.data as { id: string }).id,
  })
  async deleteWebhook(@Args('data') { id }: WebhookIdInput) {
    return await this.service.delete(id);
  }

  @Mutation(() => Webhook)
  @RequirePermission({ capability: Capability.WebhookManage, scope: ScopeKind.Webhook })
  @AuditWeb({
    action: 'update',
    resourceType: 'webhook',
    resourceId: (a) => (a.data as { id: string }).id,
  })
  async rotateWebhookSecret(@Args('data') { id }: WebhookIdInput) {
    return await this.service.rotateSecret(id);
  }
}
