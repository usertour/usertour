import { Field, InputType } from '@nestjs/graphql';

import { SubscriptionInterval } from '../types/subscription.type';
import type { SubscriptionPlanType } from '../types/subscription-plan-type.type';

@InputType()
export class CreateCheckoutSessionRequest {
  @Field(() => String)
  planType: SubscriptionPlanType;

  @Field(() => String)
  interval: SubscriptionInterval;

  @Field(() => String)
  projectId: string;
}
