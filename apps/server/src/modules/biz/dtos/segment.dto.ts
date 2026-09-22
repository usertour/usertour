import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

import { BaseModel } from '@/common/models/base.model';

import { SegmentBizType } from '../constants/segment-biz-type.constant';
import { SegmentDataType } from '../constants/segment-data-type.constant';

registerEnumType(SegmentDataType, {
  name: 'SegmentDataType',
});
registerEnumType(SegmentBizType, {
  name: 'SegmentBizType',
});

@ObjectType('Segment')
export class SegmentDTO extends BaseModel {
  @Field(() => String, { nullable: true })
  projectId?: string;

  @Field(() => String, { nullable: true })
  environmentId?: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  columns?: JsonValue;

  //1,bizUser，2 bizCompany
  @Field(() => SegmentBizType)
  bizType: number;

  //1:All, 2:Condition, 3:Manual
  @Field(() => SegmentDataType)
  dataType: number;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonValue;

  /** 'internal' for hand-made segments; a provider id when synced (ADR 0012). */
  @Field(() => String, { nullable: true })
  source?: string;

  /** The provider-side cohort id backing a synced segment. */
  @Field(() => String, { nullable: true })
  sourceId?: string | null;
}
