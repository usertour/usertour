import { Field, ObjectType } from '@nestjs/graphql';
import { JsonObject } from '@prisma/client/runtime/library';
import { GraphQLJSONObject } from 'graphql-type-json';

import { BaseDTO } from '@/modules/common/dtos/base.dto';

@ObjectType('BizUserOnSegmentModel')
export class BizUserOnSegmentDTO extends BaseDTO {
  @Field(() => String)
  segmentId: string;

  @Field(() => String)
  bizUserId: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  data?: JsonObject;
}
