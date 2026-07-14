import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';
import { JsonObject } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class BizModel extends BaseModel {
  @Field(() => String)
  environmentId: string;

  @Field(() => String)
  externalId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;

  // Populated only on membership-detail reads — explicitly nullable so the
  // contract can't drift with toolchain nullability inference.
  @Field(() => GraphQLJSON, { nullable: true })
  membership?: JsonObject;
}

@ObjectType()
export class BizUserOnCompanyModel extends BaseModel {
  @Field(() => String)
  bizCompanyId: string;

  @Field(() => BizModel, { nullable: true })
  bizCompany?: BizModel;

  @Field(() => String)
  bizUserId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;
}

@ObjectType()
export class BizUser extends BizModel {
  @Field(() => [BizUserOnCompanyModel], { nullable: true })
  bizUsersOnCompany?: BizUserOnCompanyModel[];
}
