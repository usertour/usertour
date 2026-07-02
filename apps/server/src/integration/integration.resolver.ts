import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Integration, SalesforceObjectFields, IntegrationObjectMapping } from './integration.model';
import {
  UpdateIntegrationInput,
  UpdateIntegrationObjectMappingInput,
  CreateIntegrationObjectMappingInput,
} from './integration.dto';
import { IntegrationService } from './integration.service';
import { UseGuards } from '@nestjs/common';

import { AuditWeb } from '@/audit/audit.decorator';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { Capability } from '@usertour/types';

@Resolver(() => Integration)
@UseGuards(PermissionGuard)
export class IntegrationResolver {
  constructor(private integrationService: IntegrationService) {}

  /**
   * List all integration for a given environment
   * @param environmentId - The ID of the environment
   * @returns List of integration
   */
  @Query(() => [Integration])
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Environment })
  async listIntegrations(@Args('environmentId') environmentId: string) {
    return this.integrationService.findAllIntegrations(environmentId);
  }

  /**
   * Get an integration for a given environment and provider
   * @param environmentId - The ID of the environment
   * @param provider - The provider of the integration
   * @returns The integration
   */
  @Query(() => Integration)
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Environment })
  async getIntegration(
    @Args('environmentId') environmentId: string,
    @Args('provider') provider: string,
  ) {
    return this.integrationService.findOneIntegration(environmentId, provider);
  }

  /**
   * Update an integration's configuration
   * @param environmentId - The ID of the environment
   * @param provider - The provider of the integration
   * @param input - The update data
   * @returns The updated integration
   */
  @Mutation(() => Integration)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Environment })
  // Third-party data-flow config on/off — credentials in the snapshot are blanked
  // by REDACT_KEYS_BY_TYPE (key / accessToken / config).
  @AuditWeb({
    action: 'update',
    resourceType: 'integration',
    resourceId: (_a, r) => String((r as { id?: string })?.id ?? ''),
    environmentId: (a) => String(a.environmentId ?? ''),
  })
  async updateIntegration(
    @Args('environmentId') environmentId: string,
    @Args('provider') provider: string,
    @Args('input') input: UpdateIntegrationInput,
  ) {
    return this.integrationService.updateIntegration(environmentId, provider, input);
  }

  @Query(() => String)
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Environment })
  async getSalesforceAuthUrl(
    @Args('environmentId') environmentId: string,
    @Args('provider') provider: string,
  ) {
    const { url } = await this.integrationService.getSalesforceAuthUrl(environmentId, provider);
    return url;
  }

  /**
   * Get Salesforce object fields
   * @param integrationId - The ID of the integration
   * @returns List of Salesforce objects with their fields
   */
  @Query(() => SalesforceObjectFields)
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Integration })
  async getSalesforceObjectFields(@Args('integrationId') integrationId: string) {
    return this.integrationService.getSalesforceObjectFields(integrationId);
  }

  /**
   * Get all object mappings for an integration
   * @param integrationId - The ID of the integration
   * @returns List of object mappings
   */
  @Query(() => [IntegrationObjectMapping])
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Integration })
  async getIntegrationObjectMappings(@Args('integrationId') integrationId: string) {
    return this.integrationService.getIntegrationObjectMappings(integrationId);
  }

  /**
   * Get a specific object mapping by ID
   * @param id - The ID of the object mapping
   * @returns The object mapping
   */
  @Query(() => IntegrationObjectMapping)
  @RequirePermission({ capability: Capability.IntegrationRead, scope: ScopeKind.Integration })
  async getIntegrationObjectMapping(@Args('id') id: string) {
    return this.integrationService.getIntegrationObjectMapping(id);
  }

  /**
   * Create or update an object mapping
   * @param integrationId - The ID of the integration
   * @param input - The mapping data
   * @returns The created/updated object mapping
   */
  @Mutation(() => IntegrationObjectMapping)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  @AuditWeb({
    action: 'update',
    resourceType: 'integration',
    resourceId: (a) => String(a.integrationId ?? ''),
  })
  async upsertIntegrationObjectMapping(
    @Args('integrationId') integrationId: string,
    @Args('input') input: CreateIntegrationObjectMappingInput,
  ) {
    return this.integrationService.upsertIntegrationObjectMapping(
      integrationId,
      input.sourceObjectType,
      input.destinationObjectType,
      input.settings,
      input.enabled,
    );
  }

  /**
   * Update an object mapping
   * @param id - The ID of the object mapping
   * @param input - The update data
   * @returns The updated object mapping
   */
  @Mutation(() => IntegrationObjectMapping)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  // args carry only the MAPPING id; the integration id comes from the result.
  @AuditWeb({
    action: 'update',
    resourceType: 'integration',
    resourceId: (_a, r) => String((r as { integrationId?: string })?.integrationId ?? ''),
  })
  async updateIntegrationObjectMapping(
    @Args('id') id: string,
    @Args('input') input: UpdateIntegrationObjectMappingInput,
  ) {
    return this.integrationService.updateIntegrationObjectMapping(
      id,
      input.settings,
      input.enabled,
    );
  }

  /**
   * Delete an object mapping
   * @param id - The ID of the object mapping
   * @returns Success status
   */
  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Integration })
  // Only the mapping id is available (result is a Boolean); operation names the act.
  @AuditWeb({
    action: 'update',
    resourceType: 'integration',
    resourceId: (a) => String(a.id ?? ''),
  })
  async deleteIntegrationObjectMapping(@Args('id') id: string) {
    await this.integrationService.deleteIntegrationObjectMapping(id);
    return true;
  }

  /**
   * Disconnect an integration
   * @param environmentId - The ID of the environment
   * @param provider - The provider of the integration
   * @returns The disconnected integration
   */
  @Mutation(() => Integration)
  @RequirePermission({ capability: Capability.IntegrationManage, scope: ScopeKind.Environment })
  @AuditWeb({
    action: 'update',
    resourceType: 'integration',
    resourceId: (_a, r) => String((r as { id?: string })?.id ?? ''),
    environmentId: (a) => String(a.environmentId ?? ''),
  })
  async disconnectIntegration(
    @Args('environmentId') environmentId: string,
    @Args('provider') provider: string,
  ) {
    return this.integrationService.disconnectIntegration(environmentId, provider);
  }
}
