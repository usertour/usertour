import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Integration } from './integration.model';
import { UpdateIntegrationInput } from './integration.dto';
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
