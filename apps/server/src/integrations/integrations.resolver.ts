import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { Request } from 'express';
import { Capability } from '@usertour/types';
import { AuditWeb } from '@/audit/audit.decorator';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { UserEntity } from '@/common/decorators/user.decorator';
import { User } from '@/users/models/user.model';
import {
  IntegrationIdInput,
  QueryIntegrationsInput,
  StartCrmOAuthInput,
  UpdateIntegrationInboundInput,
  UpsertIntegrationInput,
} from './dto/integration.input';
import {
  CrmOAuthStart,
  Integration,
  IntegrationMessageConnection,
  IntegrationSyncedSegment,
} from './models/integration.model';
import { CrmConnectionService } from './crm/crm-connection.service';
import { CrmMappingService } from './crm/crm-mapping.service';
import { CrmJournalService } from './crm/crm-journal.service';
import { CrmSyncService } from './crm/crm-sync.service';
import {
  IntegrationObjectMappingIdInput,
  ListCrmRemotePropertiesArgs,
  UpsertIntegrationObjectMappingInput,
} from './dto/crm-mapping.input';
import { CrmRemoteProperty, IntegrationObjectMapping } from './models/crm-mapping.model';
import { IntegrationsService } from './integrations.service';

@Resolver(() => Integration)
@UseGuards(PermissionGuard)
export class IntegrationsResolver {
  constructor(
    private service: IntegrationsService,
    private connections: CrmConnectionService,
    private mappings: CrmMappingService,
    private crmSync: CrmSyncService,
    private journal: CrmJournalService,
  ) {}

  // ---------------------------------------------------------------------------
  // CRM object mappings (ADR 0013 §4-6)
  // ---------------------------------------------------------------------------

  @Query(() => [IntegrationObjectMapping])
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Integration })
  async listIntegrationObjectMappings(@Args('integrationId') integrationId: string) {
    return await this.mappings.listMappings(integrationId);
  }

  /** Live provider property metadata — the editor's pickers read from here. */
  @Query(() => [CrmRemoteProperty])
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Integration })
  async listCrmRemoteProperties(
    @Args() { integrationId, remoteObject }: ListCrmRemotePropertiesArgs,
  ) {
    return await this.mappings.listRemoteProperties(integrationId, remoteObject);
  }

  @Mutation(() => IntegrationObjectMapping)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  @AuditWeb({
    action: 'update',
    resourceType: 'integration',
    resourceId: (a) => (a.data as { integrationId: string }).integrationId,
  })
  async upsertIntegrationObjectMapping(@Args('data') data: UpsertIntegrationObjectMappingInput) {
    return await this.mappings.upsertMapping(data);
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  @AuditWeb({
    action: 'update',
    resourceType: 'integration',
    resourceId: (a) => (a.data as { integrationId: string }).integrationId,
  })
  async deleteIntegrationObjectMapping(@Args('data') data: IntegrationObjectMappingIdInput) {
    return await this.mappings.deleteMapping(data);
  }

  /** "Sync now": claim a full-sync round for the mapping (refused while one is running). */
  @Mutation(() => IntegrationObjectMapping)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  async runIntegrationObjectMappingSync(@Args('data') data: IntegrationObjectMappingIdInput) {
    return await this.crmSync.startFullSync(data.id, {
      manual: true,
      integrationId: data.integrationId,
    });
  }

  // ---------------------------------------------------------------------------
  // CRM connections (ADR 0013)
  // ---------------------------------------------------------------------------

  /** Mint the provider authorize URL; the browser navigates there and returns via the callback. */
  @Mutation(() => CrmOAuthStart)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  async startCrmOAuth(@Args('data') data: StartCrmOAuthInput, @UserEntity() user: User) {
    return await this.connections.startOAuth({ ...data, userId: user.id });
  }

  @Mutation(() => Integration)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  @AuditWeb({
    action: 'update',
    resourceType: 'integration',
    resourceId: (a) => (a.data as { id: string }).id,
    environmentId: (_a, r) => (r as { environmentId: string } | undefined)?.environmentId,
  })
  async disconnectCrmIntegration(
    @Args('data') { id }: IntegrationIdInput,
    @Context() context: { req?: Request },
  ) {
    const before = await this.service.getById(id, context.req);
    // Best-effort: the change subscriptions die with the grant.
    try {
      await this.journal.removeSubscriptions({
        id,
        provider: before.provider,
        remoteAccountId: before.remoteAccountId,
      });
    } catch {
      // Logged by the provider call site; the disconnect itself proceeds.
    }
    await this.connections.disconnect(id);
    return await this.service.getById(id, context.req);
  }

  @Query(() => [Integration])
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Integration })
  async listIntegrations(
    @Args() { environmentId }: QueryIntegrationsInput,
    @Context() context: { req?: Request },
  ) {
    // The request threads through to inboundUrlFor: with API_URL unset the
    // receive URL falls back to this request's origin.
    return await this.service.list(environmentId, context.req);
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
  async upsertIntegration(
    @Args('data') data: UpsertIntegrationInput,
    @Context() context: { req?: Request },
  ) {
    return await this.service.upsert(data, context.req);
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
  async updateIntegrationInbound(
    @Args('data') data: UpdateIntegrationInboundInput,
    @Context() context: { req?: Request },
  ) {
    return await this.service.updateInbound(data, context.req);
  }

  @Mutation(() => Integration)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  @AuditWeb({
    action: 'update',
    resourceType: 'integration',
    resourceId: (a) => (a.data as { id: string }).id,
    environmentId: (_a, r) => (r as { environmentId: string } | undefined)?.environmentId,
  })
  async rotateIntegrationInboundToken(
    @Args('data') { id }: IntegrationIdInput,
    @Context() context: { req?: Request },
  ) {
    return await this.service.rotateInboundToken(id, context.req);
  }
}
