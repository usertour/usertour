/** The cloud subscription plans. The object is the one list; the type derives from it. */
export const SubscriptionPlanType = {
  hobby: 'hobby',
  starter: 'starter',
  growth: 'growth',
  business: 'business',
} as const;

export type SubscriptionPlanType = keyof typeof SubscriptionPlanType;
