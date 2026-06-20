# 0007: Per-project OIDC SSO — enforcement, provisioning, and session model

- **Date:** 2026-06-20
- **Status:** Accepted

## Context

`ssoOidc` was already declared a per-project `BUSINESS+` plan feature in billing, but no SSO existed. Enterprise customers need their team to sign in through their own IdP (Okta, Azure Entra, Auth0, OneLogin, Authentik, Google Workspace, …). This ADR records the design that shipped in `feat/v0.8.6` and, more importantly, the alternatives we rejected so they aren't re-litigated.

One architectural fact constrains nearly every decision below:

> **usertour uses a single global account + global session.** `User.email` is globally unique; a sign-in produces one account-level session (JWT, not project-bound); project access is checked per-request from `UserOnProject` membership. A user can belong to many projects with one login.

Everything about enforcement granularity, session lifetime, and "force SSO" semantics follows from that. The system also runs in both SaaS (entitlement from Stripe subscription) and self-host (entitlement from license); `ProjectsService.getProjectConfig` already branches internally, so the same gate code serves both.

## Decision

### 1. Protocol & architecture

- **OIDC only (v1), per-project.** `openid-client` v5, discovery-based (`Issuer.discover(issuer)` reads `/.well-known/openid-configuration`), Authorization Code + PKCE (`S256`). No SAML, no manual-endpoint connector in v1.
- **One fixed callback** `<API_URL>/api/auth/sso/callback` for every provider; the provider is resolved from a short-lived signed `usertour_sso_tx` cookie (carries state/nonce/codeVerifier/providerId). So a single redirect URI is registered at the IdP.
- **Entry point** `/auth/sso/:projectId` (public). A public query `getProjectSsoLogin(projectId)` returns the project's branding (name + logo) and its active providers, gated server-side by the project's `ssoOidc` entitlement.
- **Data model:** `ProjectSSOIdentityProvider` (per-project provider rows) + `ProjectSsoSettings` (per-project: `requireSso`, `autoProvision`, `defaultRole`, `allowedDomains`; absent row = no-enforce / ADMIN default / trust-IdP).

### 2. Identity resolution (email)

- Primary source is the ID token's claims. **When the ID token has no `email`, call the userinfo endpoint once and merge** its claims (`SsoOidcService.exchangeCallback`). The common case where the ID token carries `email` stays a single round-trip.
- The address is resolved across `email ?? upn ?? preferred_username`. Some IdPs (notably Azure Entra) omit `email` from the ID token and surface identity only via userinfo or in `upn` / `preferred_username`.
- **`email_verified` gate rejects only an explicit `false`** (`auth.service.ts`). A missing claim is treated as trust-the-IdP, because several compliant IdPs simply don't emit it; an explicit `false` is the only signal strong enough to reject on.

### 3. Provisioning (JIT)

- **Invite-required by default; `autoProvision` is opt-in (default `false`).** `resolveSsoJoinRole`: an invite → the invite's role; no invite + `autoProvision` off → reject (`SsoAccessDeniedError` E0053); `autoProvision` on → `defaultRole`, after an optional `allowedDomains` filter.
- **Safe linking:** an existing global user is linked into a project only if they are already a member or hold an invite. The IdP has no standing to pull an outside global account into a project it doesn't belong to — and since `User.email` is globally unique, unconditional linking would be a cross-tenant account-takeover vector. This replaces the need for DNS domain verification (see Alternatives F).
- Rationale: per-seat billing + owner-controlled membership. SSO is an authentication mechanism, not an open door into the project.

### 4. Force-SSO enforcement

- **A single per-project `requireSso` boolean**, not a per-method matrix. The sign-in surface is unified and produces a global session, so at authentication time the server can't attribute the attempt to a target project; one boolean per project is the honest granularity.
- **Single choke point:** `AuthService.issueTokensOrChallenge(userId, viaSso=false)` → `assertNotSsoLocked`. A non-SSO sign-in (password / social / magic-link) is rejected when the user is a **non-OWNER** member of **any** project that enforces SSO *and still has the entitlement*; it throws `SsoRequiredError` (E0051) carrying that `projectId`, and the SSO callback's `finishSso` passes `viaSso=true` to skip the check. The lock is therefore **account-level** — a direct consequence of the global session (see Consequences).
- **Break-glass:** project OWNERs (per-project role) and `User.isSystemAdmin` keep password access, so an IdP outage can't lock out the people who can fix it.
- **Anti-lockout:** `requireSso` can only be turned on with an active provider (`SsoRequiresActiveProviderError` E0052); the last active provider can't be removed while enforcement is on.
- **Entitlement lapse drops the gate:** if a project loses `ssoOidc` (downgrade / expiry), its enforcement goes inert — otherwise a lapsed project would lock members out entirely (mirrors the 2FA "license lapse → drop the gate" rule).
- **Existing sessions are not revoked** on enable; enforcement applies at the next sign-in only.
- The enable-confirmation dialog warns that members who joined with an email absent from the IdP will lose access.

### 5. Session / token model

- **Access token 1h, refresh token 7d, rolling.** Each refresh re-issues a new refresh token with `expiresAt = now + 7d` (`generateRefreshToken`); the front end refreshes silently on `E0011` (`apollo/middlewares/errors.ts`).
- **No absolute session cap and no idle timeout** beyond the 7-day refresh window.
- **The refresh path deliberately bypasses force-SSO.** `refreshAccessToken` calls `login()` directly, not `issueTokensOrChallenge`, so it does not re-run `assertNotSsoLocked` (and does not re-challenge 2FA). See Alternative C for why this is intentional.

## Consequences

**Good**

- Standard discovery-based OIDC: major IdPs work without provider-specific code.
- Under the global-session model, account-level force-SSO has **no bypass** — no non-SSO sign-in method can mint a session that reaches an SSO-enforced project.
- Break-glass + entitlement-lapse-drops-gate make it very hard to permanently lock anyone out, including during IdP/billing failures.
- One code path for SaaS and self-host.

**Bad / accepted trade-offs**

- **Policy spillover.** Because the lock is account-level, a user enforced by project X is forced through SSO even when signing in to reach an unrelated, non-enforcing project Y. This is inherent to a global session and is always in the "more strict" direction (no security loss for Y).
- **Delayed effect on active sessions.** Force-SSO is evaluated only at sign-in; a continuously active user refreshes past it (bypass in §5) and is forced through SSO only after the refresh window (≤7 days of inactivity) lapses and they sign in again.
- **IdP-external existing members lose access** when SSO is enforced (their email isn't in the IdP, so SSO returns a different identity that can't link). This is correct — enforcing SSO means "only identities my IdP vouches for" — and is governance that belongs on the IdP side. The enable dialog states it.
- No absolute or idle session cap (see Alternative G).

## Alternatives Considered

### A. Per-method enforcement matrix (disable specific sign-in methods per project)

**Rejected because:** the sign-in surface is unified and yields a global session; at auth time the server can't tell which project the user is heading for, so a per-method matrix has nothing project-specific to act on. A single `requireSso` boolean carries all the meaning the architecture can honor.

### B. Step-up auth / project-scoped tokens (relax the spillover)

Let a password login mint a half-identity session, list the user's projects, and require SSO only when they pick an SSO-enforced one.

**Rejected because:** it requires turning the global session into a project-scoped one and re-checking SSO satisfaction on every project-scoped request — a large architectural change. The spillover it fixes only bites a user who belongs to *multiple unrelated organizations where some enforce SSO*, which is both low-probability and arguably incoherent; the worst case there is "one extra SSO hop," not a lockout. Critically, a project-chooser page that gates SSO in the **UI** would be *false security* — the global session can skip the UI and call the API directly. Authentication decisions must live in the token layer, not a page.

### C. Re-check force-SSO on token refresh (shrink the delay from §5)

Re-run `assertNotSsoLocked` inside `refreshAccessToken` so enforcement reaches active sessions within an access-token TTL instead of a refresh window.

**Rejected because:** refresh is a high-frequency path; re-validating project policy on every refresh trades real DB cost for marginal benefit. JWT statelessness caps immediacy at the access-token TTL regardless (an issued token can't be revoked mid-life), so this can shrink the delay but never reach zero — and our refresh window (7d) already bounds the worst case. If immediacy ever matters, the right lever is a shorter/configurable refresh TTL or a session-version invalidation, not a per-refresh policy query. (Note: 2FA can't be re-run here either — `issueTokensOrChallenge` would re-issue a challenge on every refresh.)

### D. Member email pre-scan on enforce (list members who will lose access)

**Rejected because:** IdP-external emails sitting in an enterprise team is an IdP-side identity-governance problem, not something usertour should reconcile for the admin; a per-member bypass would break the no-bypass guarantee. A static consequence warning in the enable-confirmation dialog is the minimum — and sufficient — treatment.

### E. Generic OAuth2 connector (manual auth/token/userinfo endpoints)

**Rejected for v1:** the use case is enterprise OIDC (all support discovery) plus the existing social logins; a generic OAuth2 connector is a different need. `authorizationUrl/tokenUrl/userInfoUrl` columns are reserved on the provider model but not wired — an IdP without discovery is unsupported for now.

### F. DNS domain verification

**Rejected for v1:** safe linking (§3 — link only existing members or invite-holders) already closes the cross-tenant takeover risk. Domain verification only buys auto-onboarding of *existing global non-members* by proving domain ownership; v1 punts that case to "invite the user."

### G. Absolute session lifetime / idle timeout

**Rejected for now:** rolling refresh with no hard cap is a common, UX-friendly default. Without a concrete compliance requirement, an absolute or idle cap isn't worth the friction.

## Triggers to Revisit

- Users who belong to **multiple unrelated SSO-enforcing organizations** become common → reconsider step-up / project-scoped tokens (B).
- A customer requires **active sessions to be cut over to SSO promptly** after enforcing → evaluate a shorter/configurable refresh TTL or session-version invalidation (C), not a per-refresh check.
- A **compliance requirement** (e.g. SOC 2) mandates configurable absolute/idle session timeouts → add them as config (G).
- An IdP that **doesn't support OIDC discovery** must be supported → wire the reserved manual-endpoint columns (E).
- A need to **auto-onboard existing non-members** within an IdP-verified domain → evaluate domain verification (F).

## References

- `apps/server/src/sso/*` — SSO module: resolver, service, `sso-oidc.service.ts` (`exchangeCallback` + userinfo fallback), `sso-auth.controller.ts` (callback, `finishSso`, error redirects).
- `apps/server/src/auth/auth.service.ts` — `issueTokensOrChallenge` / `assertNotSsoLocked` / `ssoValidate` / `resolveSsoJoinRole` / `login` / `refreshAccessToken`.
- `apps/server/prisma/schema.prisma` — `ProjectSSOIdentityProvider`, `ProjectSsoSettings`.
- `apps/server/src/common/errors/errors.ts` — `SsoRequiredError` E0051, `SsoRequiresActiveProviderError` E0052, `SsoAccessDeniedError` E0053.
- `apps/web/src/pages/settings/sso/*` — provider/enforcement/provisioning settings UI.
- `apps/web/src/pages/authentication/sso.tsx` — per-project SSO entry page.
- `apps/web/src/apollo/middlewares/errors.ts` — silent refresh on `E0011`.
