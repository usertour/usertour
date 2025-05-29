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
   * List all integrations for a given environment
   * @param environmentId - The ID of the environment
   * @returns List of integrations
   */
  @Query(() => [Integration])
  @Roles([RolesScopeEnum.OWNER])
  async listIntegrations(@Args('environmentId') environmentId: string) {
    return this.integrationService.findAllIntegrations(environmentId);
  }

  /**
   * Update an integration's configuration
   * @param environmentId - The ID of the environment
   * @param code - The code of the integration
   * @param input - The update data
   * @returns The updated integration
   */
  @Mutation(() => Integration)
  @Roles([RolesScopeEnum.OWNER])
  async updateIntegration(
    @Args('environmentId') environmentId: string,
    @Args('code') code: string,
    @Args('input') input: UpdateIntegrationInput,
  ) {
    return this.integrationService.updateIntegration(environmentId, code, input);
  }
}
