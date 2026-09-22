import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { Request, Response } from 'express';
import { Capability } from '@usertour/types';
import { AuditWeb } from '@/modules/audit/decorators/audit.decorator';
import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { RequirePermission } from '@/modules/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/modules/auth/permission/scope-resolver.registry';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { UserEntity } from '@/common/decorators/user.decorator';
import { UserDTO } from '@/modules/users/dtos/user.dto';
import { INTEGRATION_TX_COOKIE } from '@/utils/cookie';
import { IntegrationIdInput } from './dtos/integration-id.input';
import { QueryIntegrationsInput } from './dtos/query-integrations.input';
import { StartIntegrationOAuthInput } from './dtos/start-integration-oauth.input';
import { UpdateIntegrationEventsInput } from './dtos/update-integration-events.input';
import { UpdateIntegrationInboundInput } from './dtos/update-integration-inbound.input';
import { UpsertIntegrationInput } from './dtos/upsert-integration.input';
import { IntegrationDTO } from './dtos/integration.dto';
import { IntegrationMessageConnectionDTO } from './dtos/integration-message-connection.dto';
import { IntegrationOAuthStartDTO } from './dtos/integration-oauth-start.dto';
import { IntegrationSyncedSegmentDTO } from './dtos/integration-synced-segment.dto';
import { ProviderConnectionService } from './sync/provider-connection.service';
import { ObjectMappingService } from './sync/object-mapping.service';
import { HubspotJournalService } from './sync/hubspot-journal.service';
import { ObjectSyncService } from './sync/object-sync.service';
import { IntegrationObjectMappingIdInput } from './dtos/integration-object-mapping-id.input';
import { ListIntegrationRemotePropertiesArgs } from './dtos/list-integration-remote-properties.input';
import { ListIntegrationSyncRunsArgs } from './dtos/list-integration-sync-runs.input';
import { UpsertIntegrationObjectMappingInput } from './dtos/upsert-integration-object-mapping.input';
import { IntegrationObjectMappingDTO } from './dtos/integration-object-mapping.dto';
import { IntegrationRemotePropertyDTO } from './dtos/integration-remote-property.dto';
import { IntegrationSyncRunDTO } from './dtos/integration-sync-run.dto';
import { IntegrationsService } from './services/integrations.service';

@Resolver(() => IntegrationDTO)
@UseGuards(PermissionGuard)
export class IntegrationsResolver {
  constructor(
    private service: IntegrationsService,
    private connections: ProviderConnectionService,
    private mappings: ObjectMappingService,
    private objectSync: ObjectSyncService,
    private journal: HubspotJournalService,
  ) {}

  // ---------------------------------------------------------------------------
  // Object mappings (ADR 0013 §4-6)
  // ---------------------------------------------------------------------------

  @Query(() => [IntegrationObjectMappingDTO])
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Integration })
  async listIntegrationObjectMappings(@Args('integrationId') integrationId: string) {
    return await this.mappings.listMappings(integrationId);
  }

  /** Recent full rounds and journal polls — the sync activity card (ADR 0013 §11). */
  @Query(() => [IntegrationSyncRunDTO])
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Integration })
  async listIntegrationSyncRuns(@Args() { integrationId, limit }: ListIntegrationSyncRunsArgs) {
    return await this.objectSync.listRuns(integrationId, limit ?? 50);
  }

  /** Live provider property metadata — the editor's pickers read from here. */
  @Query(() => [IntegrationRemotePropertyDTO])
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Integration })
  async listIntegrationRemoteProperties(
    @Args() { integrationId, remoteObject }: ListIntegrationRemotePropertiesArgs,
  ) {
    return await this.mappings.listRemoteProperties(integrationId, remoteObject);
  }

  @Mutation(() => IntegrationObjectMappingDTO)
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
  @Mutation(() => IntegrationObjectMappingDTO)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  async runIntegrationObjectMappingSync(@Args('data') data: IntegrationObjectMappingIdInput) {
    return await this.objectSync.startFullSync(data.id, {
      manual: true,
      integrationId: data.integrationId,
    });
  }

  // ---------------------------------------------------------------------------
  // Provider connections (ADR 0013)
  // ---------------------------------------------------------------------------

  /**
   * Mint the provider authorize URL for the browser to navigate to. The
   * transaction cookie is set on THIS response: it is the only proof the
   * callback accepts, and unlike a link it cannot be forwarded to someone
   * else's browser.
   */
  @Mutation(() => IntegrationOAuthStartDTO)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  async startIntegrationOAuth(
    @Args('data') data: StartIntegrationOAuthInput,
    @UserEntity() user: UserDTO,
    @Context() context: { res: Response },
  ) {
    const { url, state } = await this.connections.startOAuth({ ...data, userId: user.id });
    context.res.cookie(INTEGRATION_TX_COOKIE, state, this.connections.transactionCookieOptions());
    return { url };
  }

  @Mutation(() => IntegrationDTO)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  @AuditWeb({
    action: 'update',
    resourceType: 'integration',
    resourceId: (a) => (a.data as { id: string }).id,
    environmentId: (_a, r) => (r as { environmentId: string } | undefined)?.environmentId,
  })
  async disconnectIntegrationOAuth(
    @Args('data') { id }: IntegrationIdInput,
    @Context() context: { req?: Request },
  ) {
    // Best-effort: the change subscriptions die with the grant.
    try {
      await this.journal.removeSubscriptions(id);
    } catch {
      // Logged by the provider call site; the disconnect itself proceeds.
    }
    await this.connections.disconnect(id);
    return await this.service.getById(id, context.req);
  }

  @Query(() => [IntegrationDTO])
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Integration })
  async listIntegrations(
    @Args() { environmentId }: QueryIntegrationsInput,
    @Context() context: { req?: Request },
  ) {
    // The request threads through to inboundUrlFor: with API_URL unset the
    // receive URL falls back to this request's origin.
    return await this.service.list(environmentId, context.req);
  }

  @Query(() => IntegrationMessageConnectionDTO)
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Integration })
  async queryIntegrationMessages(
    @Args('integrationId') integrationId: string,
    @Args() pagination: PaginationArgs,
  ) {
    return await this.service.listMessages(integrationId, pagination);
  }

  @Mutation(() => IntegrationDTO)
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

  @Mutation(() => IntegrationDTO)
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
  @Mutation(() => IntegrationDTO)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  async sendIntegrationTestEvent(@Args('data') { id }: IntegrationIdInput) {
    return await this.service.sendTestEvent(id);
  }

  @Query(() => [IntegrationSyncedSegmentDTO])
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Integration })
  async queryIntegrationSyncedSegments(@Args('integrationId') integrationId: string) {
    return await this.service.listSyncedSegments(integrationId);
  }

  @Mutation(() => IntegrationDTO)
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

  /** Which milestone events a sync provider's record timeline receives (ADR 0013 §8). */
  @Mutation(() => IntegrationDTO)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  @AuditWeb({
    action: 'update',
    resourceType: 'integration',
    resourceId: (a) => (a.data as { id: string }).id,
    environmentId: (_a, r) => (r as { environmentId: string } | undefined)?.environmentId,
  })
  async updateIntegrationEvents(
    @Args('data') data: UpdateIntegrationEventsInput,
    @Context() context: { req?: Request },
  ) {
    return await this.service.updateSyncEvents(data, context.req);
  }

  @Mutation(() => IntegrationDTO)
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
