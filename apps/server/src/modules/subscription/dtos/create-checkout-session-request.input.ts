import { Field, InputType } from '@nestjs/graphql';

import type { SubscriptionInterval, SubscriptionPlanType } from '../types/subscription.type';

@InputType()
export class CreateCheckoutSessionRequest {
  @Field(() => String)
  planType: SubscriptionPlanType;

  @Field(() => String)
  interval: SubscriptionInterval;

  @Field(() => String)
  projectId: string;
}
