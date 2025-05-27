// Define plan type and subscription interval types
type PlanType = 'hobby' | 'starter' | 'growth' | 'business';
type Interval = 'monthly' | 'yearly';

// Define price lookup key mapping
const PRICE_LOOKUP_MAPPING: Record<string, { planType: PlanType; interval: Interval }> = {
  starter_monthly: { planType: 'starter', interval: 'monthly' },
  starter_yearly: { planType: 'starter', interval: 'yearly' },
  growth_monthly: { planType: 'growth', interval: 'monthly' },
  growth_yearly: { planType: 'growth', interval: 'yearly' },
  business_monthly: { planType: 'business', interval: 'monthly' },
  business_yearly: { planType: 'business', interval: 'yearly' },
};

/**
 * Parse lookup key to get plan type and interval information
 * @param lookupKey The lookup key to parse
 * @returns Plan type and interval information, or null if lookup key is invalid
 */
export function parseSubscriptionPlan(
  lookupKey: string,
): { planType: PlanType; interval: Interval } | null {
  return PRICE_LOOKUP_MAPPING[lookupKey] || null;
}
