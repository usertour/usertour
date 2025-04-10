import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SubscriptionPlanModel extends BaseModel {
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
