import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import { AuditWeb } from '@/audit/audit.decorator';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import {
  IntegrationIdInput,
  QueryIntegrationsInput,
  UpdateIntegrationInboundInput,
  UpsertIntegrationInput,
} from './dto/integration.input';
import {
  Integration,
  IntegrationMessageConnection,
  IntegrationSyncedSegment,
} from './models/integration.model';
import { IntegrationsService } from './integrations.service';

@Resolver(() => Integration)
@UseGuards(PermissionGuard)
export class IntegrationsResolver {
  constructor(private service: IntegrationsService) {}

  @Query(() => [Integration])
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Integration })
  async listIntegrations(@Args() { environmentId }: QueryIntegrationsInput) {
    return await this.service.list(environmentId);
  }

  @Query(() => IntegrationMessageConnection)
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Integration })
  async queryIntegrationMessages(
    @Args('integrationId') integrationId: string,
    @Args() pagination: PaginationArgs,
  ) {
    return await this.service.listMessages(integrationId, pagination);
  }

  @Mutation(() => Integration)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  @AuditWeb({
    action: 'update',
    resourceType: 'integration',
    resourceId: (_a, r) => (r as { id: string }).id,
    environmentId: (a) => (a.data as { environmentId: string }).environmentId,
  })
  async upsertIntegration(@Args('data') data: UpsertIntegrationInput) {
    return await this.service.upsert(data);
  }

  @Mutation(() => Integration)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  @AuditWeb({
    action: 'delete',
    resourceType: 'integration',
    resourceId: (a) => (a.data as { id: string }).id,
    environmentId: (_a, r) => (r as { environmentId: string } | undefined)?.environmentId,
  })
  async deleteIntegration(@Args('data') { id }: IntegrationIdInput) {
    return await this.service.delete(id);
  }

  // Not audited: a test message mutates nothing — the message log records it.
  @Mutation(() => Integration)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  async sendIntegrationTestEvent(@Args('data') { id }: IntegrationIdInput) {
    return await this.service.sendTestEvent(id);
  }

  @Query(() => [IntegrationSyncedSegment])
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Integration })
  async queryIntegrationSyncedSegments(@Args('integrationId') integrationId: string) {
    return await this.service.listSyncedSegments(integrationId);
  }

  @Mutation(() => Integration)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  @AuditWeb({
    action: 'update',
    resourceType: 'integration',
    resourceId: (a) => (a.data as { id: string }).id,
    environmentId: (_a, r) => (r as { environmentId: string } | undefined)?.environmentId,
  })
  async updateIntegrationInbound(@Args('data') data: UpdateIntegrationInboundInput) {
    return await this.service.updateInbound(data);
  }

  @Mutation(() => Integration)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  @AuditWeb({
    action: 'update',
    resourceType: 'integration',
    resourceId: (a) => (a.data as { id: string }).id,
    environmentId: (_a, r) => (r as { environmentId: string } | undefined)?.environmentId,
  })
  async rotateIntegrationInboundToken(@Args('data') { id }: IntegrationIdInput) {
    return await this.service.rotateInboundToken(id);
  }
}
