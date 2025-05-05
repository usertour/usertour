import { InputType, Field } from '@nestjs/graphql';

/**
 * Payment recurring interval
 */
export type SubscriptionInterval = 'monthly' | 'yearly';

/**
 * Subscription plan type
 */
export type SubscriptionPlanType = 'hobby' | 'pro' | 'growth' | 'enterprise';

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'unpaid';

export type Subscription = {
  /**
   * Subscription ID
   */
  subscriptionId: string;
  /**
   * Subscription plan type
   */
  planType: SubscriptionPlanType;
  /**
   * Payment recurring interval
   */
  interval?: SubscriptionInterval;
  /**
   * Subscription status
   */
  status: SubscriptionStatus;
  /**
   * Whether the subscription is a trial
   */
  isTrial?: boolean;
  /**
   * Subscription cancel time
   */
  cancelAt?: string;
};

export interface CreateSubscriptionParam {
  subscriptionId: string;
  customerId: string;
  lookupKey: string;
  status: SubscriptionStatus;
  planType: SubscriptionPlanType;
  interval?: SubscriptionInterval;
}

@InputType()
export class CreateCheckoutSessionRequest {
  @Field(() => String)
  planType: SubscriptionPlanType;

  @Field(() => String)
  interval: SubscriptionInterval;

  @Field(() => String)
  projectId: string;
}
