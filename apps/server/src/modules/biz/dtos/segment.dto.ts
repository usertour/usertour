import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';

import { BaseDTO } from '@/modules/common/dtos/base.dto';

import { SegmentBizType } from '../constants/segment-biz-type.constant';
import { SegmentDataType } from '../constants/segment-data-type.constant';
import { RulesConditionScalar } from './rules-condition.scalar';
import { SegmentColumnScalar } from './segment-column.scalar';

registerEnumType(SegmentDataType, {
  name: 'SegmentDataType',
});
registerEnumType(SegmentBizType, {
  name: 'SegmentBizType',
});

@ObjectType('Segment')
export class SegmentDTO extends BaseDTO {
  @Field(() => String, { nullable: true })
  projectId?: string;

  @Field(() => String, { nullable: true })
  environmentId?: string;

  @Field(() => String)
  name: string;

  @Field(() => [SegmentColumnScalar], { nullable: true })
  columns?: JsonValue;

  //1,bizUser，2 bizCompany
  @Field(() => SegmentBizType)
  bizType: number;

  //1:All, 2:Condition, 3:Manual
  @Field(() => SegmentDataType)
  dataType: number;

  /** The condition list of a CONDITION segment; empty or null for the other kinds. */
  @Field(() => [RulesConditionScalar], { nullable: true })
  data?: JsonValue;

  /** 'internal' for hand-made segments; a provider id when synced (ADR 0012). */
  @Field(() => String)
  source: string;

  /** The provider-side cohort id backing a synced segment. */
  @Field(() => String, { nullable: true })
  sourceId?: string | null;
}
