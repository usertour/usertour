import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Integration, SalesforceObjectFields, IntegrationObjectMapping } from './integration.model';
import {
  UpdateIntegrationInput,
  UpdateIntegrationObjectMappingInput,
  CreateIntegrationObjectMappingInput,
} from './integration.dto';
import { IntegrationService } from './integration.service';
import { UseGuards } from '@nestjs/common';
import { IntegrationGuard } from './integration.guard';

@Resolver(() => Integration)
@UseGuards(IntegrationGuard)
export class IntegrationResolver {
  constructor(private integrationService: IntegrationService) {}

  /**
   * List all integration for a given environment
   * @param environmentId - The ID of the environment
   * @returns List of integration
   */
  @Query(() => [Integration])
  @Roles([RolesScopeEnum.OWNER])
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
  @Roles([RolesScopeEnum.OWNER])
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
  @Roles([RolesScopeEnum.OWNER])
  async updateIntegration(
    @Args('environmentId') environmentId: string,
    @Args('provider') provider: string,
    @Args('input') input: UpdateIntegrationInput,
  ) {
    return this.integrationService.updateIntegration(environmentId, provider, input);
  }

  @Query(() => String)
  @Roles([RolesScopeEnum.OWNER])
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
  @Roles([RolesScopeEnum.OWNER])
  async getSalesforceObjectFields(@Args('integrationId') integrationId: string) {
    return this.integrationService.getSalesforceObjectFields(integrationId);
  }

  /**
   * Get all object mappings for an integration
   * @param integrationId - The ID of the integration
   * @returns List of object mappings
   */
  @Query(() => [IntegrationObjectMapping])
  @Roles([RolesScopeEnum.OWNER])
  async getIntegrationObjectMappings(@Args('integrationId') integrationId: string) {
    return this.integrationService.getIntegrationObjectMappings(integrationId);
  }

  /**
   * Get a specific object mapping by ID
   * @param id - The ID of the object mapping
   * @returns The object mapping
   */
  @Query(() => IntegrationObjectMapping)
  @Roles([RolesScopeEnum.OWNER])
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
  @Roles([RolesScopeEnum.OWNER])
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
  @Roles([RolesScopeEnum.OWNER])
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
  @Roles([RolesScopeEnum.OWNER])
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
  @Roles([RolesScopeEnum.OWNER])
  async disconnectIntegration(
    @Args('environmentId') environmentId: string,
    @Args('provider') provider: string,
  ) {
    return this.integrationService.disconnectIntegration(environmentId, provider);
  }
}
