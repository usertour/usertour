import { Field, ObjectType } from '@nestjs/graphql';
import { JsonObject } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

import { BaseModel } from '@/common/models/base.model';

@ObjectType('BizCompanyOnSegmentModel')
export class BizCompanyOnSegmentDTO extends BaseModel {
  @Field(() => String)
  segmentId: string;

  @Field(() => String)
  bizCompanyId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;
}
