// Define plan type and subscription interval types
type PlanType = 'hobby' | 'pro' | 'growth' | 'enterprise';
type Interval = 'monthly' | 'yearly';

// Define price lookup key mapping
const PRICE_LOOKUP_MAPPING: Record<string, { planType: PlanType; interval: Interval }> = {
  pro_monthly: { planType: 'pro', interval: 'monthly' },
  pro_yearly: { planType: 'pro', interval: 'yearly' },
  growth_monthly: { planType: 'growth', interval: 'monthly' },
  growth_yearly: { planType: 'growth', interval: 'yearly' },
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
