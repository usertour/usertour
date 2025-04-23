import { Common } from '@/auth/models/common.model';
import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { IntegrationsService } from './integrations.service';
import { Integration } from './models/integration.model';
import { UpsertBizIntegrationInput } from './dto/integration.input';
import { IntegrationsGuard } from './integrations.guard';

@Resolver()
@UseGuards(IntegrationsGuard)
export class IntegrationsResolver {
  constructor(private service: IntegrationsService) {}
  @Mutation(() => Common)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async upsertBizIntegration(@Args('data') data: UpsertBizIntegrationInput) {
    const success = await this.service.upsertBizIntegration(data);
    return { success };
  }

  @Query(() => [Integration])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async listIntegrations(@Args('projectId') projectId: string) {
    return await this.service.listAllIntegrations(projectId);
  }
}
