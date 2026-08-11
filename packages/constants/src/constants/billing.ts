import { PlanType, type PlanFeatures } from '@usertour/types';

export const HobbySessionLimit = 5000;
export const ProSessionLimit = 50000;
export const GrowthSessionLimit = 100000;
export const BusinessSessionLimit = 200000;

// Single source of truth for what each plan tier grants. Adding a new
// plan gate (e.g. auditLogs / ssoSaml in a future release) means:
//   1. add the field to the PlanFeatures type in @usertour/types
//   2. flip the values per tier below
//   3. read it on the server via resolvePlanFeatures
//      (from @usertour/helpers) and on the web via the same helper
//
// The pricing page renders its comparison from this matrix so the
// marketing surface and the server's gate enforcement can never drift.
// Per-subscription overrides (Subscription.overridePlan) are layered
// on top by resolvePlanFeatures in @usertour/helpers (functions go
// there, not in this package — see docs/architecture/packages.md).

const HOBBY: PlanFeatures = {
  removeBranding: false,
  customCss: false,
  auditLogs: false,
  auditLogRetentionDays: 0,
  ssoSaml: false,
  ssoOidc: false,
  sessionsLimit: HobbySessionLimit,
  teamMemberLimit: 1,
  environmentLimit: 1,
  dataRetentionYears: 1,
  apiRateLimit: 100,
};

const STARTER: PlanFeatures = {
  ...HOBBY,
  removeBranding: true,
  sessionsLimit: ProSessionLimit,
  teamMemberLimit: 3,
  environmentLimit: 2,
  dataRetentionYears: 3,
  apiRateLimit: 500,
};

const GROWTH: PlanFeatures = {
  ...STARTER,
  removeBranding: true,
  customCss: true,
  // Growth can view the audit log, but only a recent window; Business is full.
  auditLogs: true,
  auditLogRetentionDays: 7,
  sessionsLimit: GrowthSessionLimit,
  teamMemberLimit: 10,
  environmentLimit: 3,
  dataRetentionYears: 5,
  apiRateLimit: 1000,
};

const BUSINESS: PlanFeatures = {
  ...GROWTH,
  auditLogs: true,
  auditLogRetentionDays: 'unlimited',
  ssoSaml: true,
  ssoOidc: true,
  sessionsLimit: BusinessSessionLimit,
  teamMemberLimit: 'unlimited',
  environmentLimit: 'unlimited',
  dataRetentionYears: 7,
  apiRateLimit: 3000,
};

// Enterprise is license-only today and matches Business; kept as a
// separate entry so future enterprise-only gates have a place to land.
const ENTERPRISE: PlanFeatures = { ...BUSINESS };

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  [PlanType.HOBBY]: HOBBY,
  [PlanType.STARTER]: STARTER,
  [PlanType.GROWTH]: GROWTH,
  [PlanType.BUSINESS]: BUSINESS,
  [PlanType.ENTERPRISE]: ENTERPRISE,
};
