# 0008: SDK identity verification — HMAC-signed user and company identities

- **Date:** 2026-07-14
- **Status:** Accepted — §1 signature format amended by [0009](0009-jwt-identity-tokens.md) (JWT identity tokens); secret lifecycle, verification points, enforcement model, anonymous rule, and coverage stats stand

## Context

The environment token is public by design: it ships in page source to every visitor so the SDK can connect. Today it is also the **only** credential the SDK write surface requires:

- The v2 WebSocket handshake validates nothing beyond "an environment with this token exists" (`WebSocketV2Service.initializeSocketData`), then trusts the client-supplied `externalUserId` — and **creates that user during the handshake** (`ensureBizUser`).
- The per-connection identity guard (ADR 0001) pins later writes to the handshake-claimed id. It prevents cross-identity *within* a connection; it does nothing against forgery *at* the handshake, because the claimed identity was never proven.

Consequently, anyone holding the token — i.e. anyone who has viewed a customer's page — can impersonate any user, mass-create fake users, overwrite user and company attributes, and pollute analytics.

Hiding the token is a non-goal (it is inherently public). The goal is to make the token **insufficient for writes**: identity claims must be provable. The industry-converged mechanism for client-side SDKs is server-side HMAC identity verification — the customer's backend, holding a secret we issue, signs the identities it vouches for; our server verifies the signature before accepting writes under that identity.

**Scope:** the v2 WebSocket surface only. The v1 WebSocket path is being decommissioned and is explicitly out of scope. The REST OpenAPI is out of scope — it already authenticates with secret, server-side API keys.

## Decision

### 1. Signature scheme

- **User:** `hex(HMAC-SHA256(secret, externalUserId))`
- **Company:** `hex(HMAC-SHA256(secret, externalUserId + ":" + externalCompanyId))` — a **membership assertion** ("this user belongs to this company"), not a company-wide credential. See Alternative C.
- **Only identity is signed, never attributes.** A verified user forging their own attributes is corrupting their own data; preventing that is not worth re-signing on every attribute change (Alternative A).
- **No expiry.** A leaked signature compromises exactly one user (or one membership pair); secret rotation is the recovery path. Expiring signatures would force re-delivery machinery into long-lived SPA sessions for negligible gain (Alternative B).

Signatures are computed on the **customer's backend** and delivered to their frontend alongside the user identity. The SDK's public option shapes already reserve the fields: `IdentifyOptions.signature` and `GroupOptions.signature` (`packages/types/src/types/usertour.ts`) — no SDK API change is needed, only pass-through.

### 2. Verification points

- **Handshake (user):** `SocketAuthData` gains `userSignature`. Verified **before** `ensureBizUser` — the handshake itself is a write path, so verification must gate user creation. A successful handshake binds the verified identity to the socket for its lifetime.
- **Handshake (company):** `SocketAuthData.externalCompanyId` gains a companion `companySignature`, verified when a company id is supplied. Although the handshake does not write company data, the claimed company id drives content targeting; an unverified claim would leak company-targeted content to non-members.
- **`group()` message:** `UpsertCompanyDto` gains `signature`, verified on every message — the company may legitimately switch mid-session.
- **`upsertBizUsers` message:** no re-verification. The payload's `externalUserId` is already pinned to the handshake-verified identity by the ADR 0001 guard; verifying once at the handshake covers the connection.

### 3. Anonymous users

`identifyAnonymous` generates `anon-${uuidv4()}` client-side with no server round-trip, so it can never be signed. Anonymous ids minted before the prefix existed were bare UUIDs persisted in localStorage; the SDK migrates them deterministically (`anon-` + the same UUID) rather than the server relaxing its pattern — accepting bare UUIDs server-side would silently exempt real users whose ids happen to be UUIDs, punching a hole in enforcement. The CDN-distributed runtime rolls the migration out automatically. The enforced-mode invariant:

- An **unsigned** identify is accepted only when `externalUserId` matches the anonymous format (`anon-` prefix + UUID v4). Any other id requires a valid signature — a real user id cannot be smuggled through the anonymous channel.
- **Anonymous users cannot `group()`**: they can hold no membership proof, and an anonymous visitor having a company affiliation is semantically incoherent anyway.

Residual: attackers can mint junk anonymous users. That is a rate-limiting concern, accepted here.

### 4. Enforcement model

- A per-environment boolean (default **off**) — existing customers and self-hosted deployments must not break on upgrade.
- **Off:** signatures, when present, are still verified and counted (valid / invalid / missing) but never rejected. This powers the coverage metric.
- **On (enforced):** the rules in §2–§3 reject missing or invalid signatures.
- The console surfaces **signed-traffic coverage** (e.g. share of identifies with a valid signature over the last 7 days) so a customer flips enforcement only when coverage reads 100%. Two states only; the coverage metric replaces a third "warn" mode (Alternative E).

### 5. Secret lifecycle

A dedicated table rather than columns on `Environment`:

```
EnvironmentSigningSecret
  id / environmentId / secret / createdAt / lastUsedAt / revokedAt
```

- **Strictly per-environment.** Staging secrets inevitably spread to lower-trust places (CI variables, developer machines); a project-level secret would let a staging leak compromise production. The environment is the trust boundary (Alternative F).
- **At most 2 active secrets per environment.** One is the steady state; the second slot exists solely for rotation. The cap forces completing a rotation (revoking the old secret) before starting the next, preventing zombie-secret accumulation (Alternative G).
- **Rotation flow:** create the second secret → migrate backend signers → watch the old secret's `lastUsedAt` go stale in the console → revoke it. `lastUsedAt` (updated on successful verification against that secret) is what makes rotation observable and therefore safe to finish.
- Secrets are **server-generated** (`utv_` + 32 random bytes base64url); custom values are not accepted. The `utv_` prefix joins the `ut?_` credential prefix family (`utp_`/`uto_`/`utr_` from the API token work; `uts_` is reserved there for service accounts), so one secret-scanning pattern covers every Usertour credential.
- Stored **AES-256-GCM encrypted at rest** (same treatment as `User.twoFactorSecret`), decrypted for verification and console reveal. HMAC verification requires the original value, so the hash-only storage used for API tokens is impossible by construction — encryption is the ceiling, and it bounds a DB-only leak (backup, read replica, SQL injection) that doesn't also capture `ENCRYPTION_KEY`. Environment admins can always view or regenerate secrets in the console.
- Verification tries each active secret (≤2 decrypt + timing-safe HMAC comparisons per check).

### 6. Explicitly not protected (accepted)

- **Reading published content** with a bare token: content is served to anonymous visitors by design; treated as public.
- **A verified user corrupting their own data** (own attributes, own membership attributes).
- **Event flooding and junk anonymous users:** rate limiting, a separate concern.
- **Origin/domain allow-listing is not part of this design:** any non-browser client forges the `Origin` header freely; it is a cosmetic filter, not a security mechanism (Alternative D).

## Consequences

**Good**

- With enforcement on, the invariant becomes: **the environment token is not a write credential; every user write carries an identity proof, every company write carries a membership proof.** The attacker population for data tampering shrinks from "anyone who viewed the page" to "the customer's own authenticated users acting on their own data".
- No SDK breaking change: the option fields were pre-reserved; existing integrations continue to work with enforcement off.
- Safe rollout: default off, off-mode verification feeds the coverage metric, customers enforce at their own pace.
- Verification cost is negligible: ≤2 HMAC comparisons at handshake plus one per `group()`.

**Bad / accepted trade-offs**

- Customers must add server-side signing before enforcing — one HMAC per user and per user-company pair, re-delivered when the company context switches.
- Signatures never expire; a leaked per-user signature stays valid until secret rotation.
- The anonymous channel stays unsigned (junk-user spam remains possible, rate-limited).
- Enforced environments cannot attach anonymous users to companies (deliberate, see §3).

## Alternatives Considered

### A. Sign the full payload (JWT-style, attributes included)

**Rejected because:** it prevents only self-attribute forgery — a verified user corrupting data that is already theirs — while multiplying integration friction: every attribute change would need a fresh server-issued token instead of one signature per identity.

### B. Expiring signatures (JWT `exp` / TTL)

**Rejected because:** the blast radius of one leaked signature is a single user, and rotation already bounds it in time. Expiry would force every long-lived SPA session to implement signature re-delivery, a permanent integration tax on all customers to mitigate a per-user-sized risk.

### C. Company signature over `companyId` alone

**Rejected because:** that signature would be a company-wide credential delivered to every member's page — any single member's page leak lets any token holder join and write to that company. Signing the `userId:companyId` pair is a precise membership assertion at identical signing cost (both values are in hand at signing time).

### D. Domain/Origin allow-listing as the security mechanism

**Rejected because:** `Origin` is browser-enforced only; every non-browser client forges it freely. At best a cosmetic filter against casual embedding, never a barrier to a real attacker.

### E. A third "permissive/warn" enforcement state

**Rejected because:** off-mode verification counting gives the same rollout signal (coverage %) without a third mode's surface area. Two states plus observability is strictly simpler.

### F. Project-level shared signing secret

**Rejected because:** environments exist to isolate trust levels (prod vs staging); a shared secret makes the weakest environment's operational hygiene the ceiling for production's security.

### G. A single secret column on `Environment`

**Rejected because:** rotation becomes an atomic cutover that instantly invalidates every signer still on the old secret — in an enforced environment, a full outage. The two-slot table with `lastUsedAt` makes rotation gradual and observable.

### H. Hiding or frequently rotating the environment token itself

**Rejected because:** the token must ship to every anonymous visitor's browser; it is public by definition. No rotation cadence changes that — the fix is to stop treating it as a credential, which is this ADR.

## Triggers to Revisit

- Evidence of abuse through the anonymous channel that rate limiting cannot contain → revisit anonymous identity design (e.g. server-vended anonymous tokens).
- Customers with rotation windows longer than the two-slot model tolerates (e.g. many independent backend signers) → revisit the active-secret cap.
- The v1 WebSocket path surviving past its planned decommission → it would need the same verification, contradicting this ADR's scope assumption.
- Demand for verified attributes (e.g. plan/entitlement flags used for targeting that customers consider security-relevant) → revisit Alternative A with a narrower, opt-in signed-claims design.
