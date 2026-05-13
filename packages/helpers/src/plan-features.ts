import { PLAN_FEATURES } from '@usertour/constants';
import { PlanType, type PlanFeatures } from '@usertour/types';

// Parse the untyped Subscription.overridePlan JSON column into a typed
// partial. Anything we don't recognise (wrong type, unknown key) is
// dropped silently — the resolve path falls back to the base plan,
// which is the safe direction.
export function parseOverridePlan(raw: unknown): Partial<PlanFeatures> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const input = raw as Record<string, unknown>;
  const out: Partial<PlanFeatures> = {};

  for (const key of ['removeBranding', 'auditLogs', 'ssoSaml', 'ssoOidc'] as const) {
    if (typeof input[key] === 'boolean') {
      out[key] = input[key] as boolean;
    }
  }
  for (const key of [
    'sessionsLimit',
    'teamMemberLimit',
    'environmentLimit',
    'dataRetentionYears',
  ] as const) {
    const value = input[key];
    if (typeof value === 'number' || value === 'unlimited') {
      out[key] = value;
    }
  }
  if (typeof input.apiRateLimit === 'number') {
    out.apiRateLimit = input.apiRateLimit;
  }
  return out;
}

// Resolve the effective feature set for a plan, given an optional
// per-subscription override. Override fields directly replace base
// fields — admin / CS choices win, including negotiated downgrades.
//
// The billing page passes the user's overridePlan when rendering paid
// plan cards so they see their actual effective benefits. Hobby is the
// canceled state — overrides don't apply there, so callers should pass
// undefined for the Hobby case.
export function resolvePlanFeatures(planType: string, overridePlan?: unknown): PlanFeatures {
  const base = PLAN_FEATURES[planType as PlanType] ?? PLAN_FEATURES[PlanType.HOBBY];
  const overrides = parseOverridePlan(overridePlan);
  return { ...base, ...overrides };
}

// True when the current usage is still under the configured cap.
// 'unlimited' always returns true. Centralised here so per-quota check
// code at the call site stays a one-liner.
export function isWithinLimit(limit: number | 'unlimited', current: number): boolean {
  return limit === 'unlimited' || current < limit;
}
