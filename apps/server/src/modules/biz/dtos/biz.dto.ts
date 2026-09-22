import { Field, ObjectType } from '@nestjs/graphql';
import { JsonObject } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

import { BaseModel } from '@/common/models/base.model';

@ObjectType('BizModel')
export class BizModelDTO extends BaseModel {
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
