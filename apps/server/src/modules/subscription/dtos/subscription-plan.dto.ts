import { Field, ObjectType } from '@nestjs/graphql';

import { BaseModel } from '@/common/models/base.model';

@ObjectType('SubscriptionPlanModel')
export class SubscriptionPlanDTO extends BaseModel {
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
