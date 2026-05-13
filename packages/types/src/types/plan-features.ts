// Shape of the per-plan feature flags. The actual matrix
// (`PLAN_FEATURES`) lives in `@usertour-packages/constants` so both the server
// (gate enforcement) and the pricing page (comparison table) read from
// the same source. This file holds the type contract only — see the
// types-vs-constants boundary in docs/architecture/packages.md.

export type PlanFeatures = {
  removeBranding: boolean;

  // Future gates — declared with safe defaults so the type is stable
  // before each consumer is wired.
  auditLogs: boolean;
  ssoSaml: boolean;
  ssoOidc: boolean;

  // Quotas. 'unlimited' is the explicit unbounded marker; we deliberately
  // avoid Infinity / null so it survives JSON round-trips and reads
  // cleanly at call sites.
  sessionsLimit: number | 'unlimited';
  teamMemberLimit: number | 'unlimited';
  environmentLimit: number | 'unlimited';
  dataRetentionYears: number | 'unlimited';
  apiRateLimit: number;
};
