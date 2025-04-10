/**
 * Payment recurring interval
 */
export type SubscriptionInterval = 'monthly' | 'yearly';

/**
 * Subscription plan type
 */
export type SubscriptionPlanType = 'free' | 'plus' | 'pro' | 'max' | 'ultra';

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

export type CreateCheckoutSessionRequest = {
  /**
   * Subscription plan type
   */
  planType: SubscriptionPlanType;
  /**
   * Subscription billing interval
   */
  interval?: SubscriptionInterval;
};

export type CreateCheckoutSessionResponse = {
  /**
   * Checkout session
   */
  data?: {
    /**
     * Checkout session URL
     */
    url?: string;
  };
};

export type CreatePortalSessionResponse = {
  /**
   * Portal session
   */
  data?: {
    /**
     * Portal session URL
     */
    url?: string;
  };
};

export type SubscriptionPlan = {
  /**
   * Subscription plan type
   */
  planType: string;
  /**
   * Session count quota
   */
  sessionCountQuota: number;
  /**
   * MAU quota
   */
  mauQuota: number;
};

export type GetSubscriptionPlansResponse = {
  /**
   * Subscription plans
   */
  data?: Array<SubscriptionPlan>;
};
