import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  CreateLocalizationInput,
  DeleteLocalizationInput,
  QueryLocalizationInput,
  UpdateLocalizationInput,
} from './dto/localization.input';
import { LocalizationsGuard } from './localizations.guard';
import { LocalizationsService } from './localizations.service';
import { Localization } from './models/localization.model';

@Resolver(() => Localization)
@UseGuards(LocalizationsGuard)
export class LocalizationsResolver {
  constructor(private service: LocalizationsService) {}

  @Mutation(() => Localization)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async createLocalization(@Args('data') data: CreateLocalizationInput) {
    return this.service.create(data);
  }

  @Mutation(() => Localization)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async updateLocalization(@Args('data') data: UpdateLocalizationInput) {
    return await this.service.update(data);
  }

  @Mutation(() => Localization)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async setDefaultLocalization(@Args('id') id: string) {
    return await this.service.setDefault(id);
  }

  @Mutation(() => Localization)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async deleteLocalization(@Args('data') { id }: DeleteLocalizationInput) {
    return await this.service.delete(id);
  }

  @Query(() => [Localization])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  async listLocalizations(@Args() { projectId }: QueryLocalizationInput) {
    return await this.service.findMany(projectId);
  }
}
