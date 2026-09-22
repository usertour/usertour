import { Field, ObjectType } from '@nestjs/graphql';
import { JsonObject } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

import { BaseModel } from '@/common/models/base.model';

@ObjectType('BizUserOnSegmentModel')
export class BizUserOnSegmentDTO extends BaseModel {
  @Field(() => String)
  segmentId: string;

  @Field(() => String)
  bizUserId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;
}
