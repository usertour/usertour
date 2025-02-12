import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AttributesGuard } from './attributes.guard';
import { AttributesService } from './attributes.service';
import {
  CreateAttributeInput,
  DeleteAttributeInput,
  QueryAttributeInput,
  UpdateAttributeInput,
} from './dto/attribute.input';
import { Attribute } from './models/attribute.model';

@Resolver(() => Attribute)
@UseGuards(AttributesGuard)
export class AttributesResolver {
  constructor(private service: AttributesService) {}

  @Mutation(() => Attribute)
  @Roles([RolesScopeEnum.ADMIN])
  async createAttribute(@Args('data') data: CreateAttributeInput) {
    return this.service.create(data);
  }

  @Mutation(() => Attribute)
  @Roles([RolesScopeEnum.ADMIN])
  async updateAttribute(@Args('data') data: UpdateAttributeInput) {
    return await this.service.update(data);
  }

  @Mutation(() => Attribute)
  @Roles([RolesScopeEnum.ADMIN])
  async deleteAttribute(@Args('data') { id }: DeleteAttributeInput) {
    return await this.service.delete(id);
  }

  @Query(() => [Attribute])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  async listAttributes(@Args() { projectId, bizType }: QueryAttributeInput) {
    return await this.service.list(projectId, bizType);
  }
}
