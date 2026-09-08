// Shape of the per-plan feature flags. The actual matrix
// (`PLAN_FEATURES`) lives in `@usertour/constants` so both the server
// (gate enforcement) and the pricing page (comparison table) read from
// the same source. This file holds the type contract only — see the
// types-vs-constants boundary in docs/architecture/packages.md.

export type PlanFeatures = {
  removeBranding: boolean;

  // Theme-level custom CSS (and the Custom font that depends on it).
  // Gated at/above removeBranding because custom CSS can hide the
  // "Made with Usertour" badge — see the gate's enforcement in the
  // session builder (it strips customCss from the theme it ships when
  // this is false).
  customCss: boolean;

  // Future gates — declared with safe defaults so the type is stable
  // before each consumer is wired.
  auditLogs: boolean;
  // How far back the audit log is viewable, by plan: 0 = no access, a number =
  // last N days, 'unlimited' = full history. A read-window only (rows are never
  // deleted) — lower paid tiers see a recent window, top tier sees everything.
  auditLogRetentionDays: number | 'unlimited';
  ssoSaml: boolean;
  ssoOidc: boolean;

  // Outbound webhooks (ADR 0010). Cloud: paid tiers only (Starter+). Self-hosted
  // is never gated — it is a usage/feature limit, not an enterprise feature, so
  // getProjectConfig forces it on there (same treatment as customCss).
  webhooks: boolean;

  // Outbound integrations (ADR 0011): analytics-provider event push. Same
  // gate shape as webhooks — cloud Starter+, self-hosted never gated.
  integrations: boolean;

  // CRM sync (ADR 0013): OAuth-connected CRM providers with bidirectional
  // object mapping. Cloud Growth+; self-hosted never gated — a self-hosted
  // operator registers and uploads their own provider app, so the feature is
  // not double-charged (getProjectConfig forces it on there).
  crmIntegrations: boolean;

  // Quotas. 'unlimited' is the explicit unbounded marker; we deliberately
  // avoid Infinity / null so it survives JSON round-trips and reads
  // cleanly at call sites.
  sessionsLimit: number | 'unlimited';
  teamMemberLimit: number | 'unlimited';
  environmentLimit: number | 'unlimited';
  dataRetentionYears: number | 'unlimited';
  apiRateLimit: number;
};
