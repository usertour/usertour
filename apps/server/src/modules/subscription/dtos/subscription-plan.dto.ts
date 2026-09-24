import { Field, ObjectType } from '@nestjs/graphql';

import { BaseDTO } from '@/modules/common/dtos/base.dto';

@ObjectType('SubscriptionPlanModel')
export class SubscriptionPlanDTO extends BaseDTO {
  @Field(() => String)
  planType: string;

  @Field(() => String)
  interval: string;

  @Field(() => String)
  lookupKey: string;

  @Field(() => Number)
  mauQuota: number;

  @Field(() => Number)
  sessionCountQuota: number;
}
