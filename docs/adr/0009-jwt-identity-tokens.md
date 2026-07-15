# 0009: JWT identity tokens replace bare HMAC signatures

- **Date:** 2026-07-15
- **Status:** Accepted (amends 0008)

## Context

ADR 0008 established SDK identity verification with two bare HMAC-SHA256 hex signatures: one over `externalUserId`, one over `externalUserId:externalCompanyId`. Before the feature shipped, three pieces of evidence arrived:

1. **The long-established vendor in the adjacent in-app messaging category deprecated its bare-HMAC identity-verification scheme** and now recommends JWT authentication (`sub`-style claims, optional expiry, session established after one verification). Its product grew surfaces (AI agent workflows, verified user data) that a dead-format hex digest could not carry, and the migration cost landed on every customer. That is the end state of shipping a non-extensible format.
2. **Newer products in the same category are JWT-native from day one**, including console token validators, confirming where the category converged.
3. **This feature is unreleased**: the migration cost of switching formats is zero exactly once, now.

The friction arguments that led 0008 to reject JWT (Alternative A: re-sign on every attribute change; Alternative B: forced expiry burden on long-lived SPAs) do not apply to a *minimal-claims JWT with optional expiry* — that shape was not considered.

## Decision

### 1. Token format

The identity proof is a **JWT, HS256**, signed with the environment's existing `utv_` signing secret (secret lifecycle from ADR 0008 unchanged — dual-slot, encrypted at rest, `lastUsedAt`):

```
{ sub: externalUserId, companyId?: externalCompanyId, exp?: <unix seconds> }
```

- **`sub` is required** and must equal the claimed `externalUserId`.
- **`companyId` is the membership assertion**, replacing the second HMAC signature. One token carries both proofs; `group()` to a new company requires a fresh token with the matching claim.
- **`exp` is optional but enforced when present** — customers choose their replay-window posture; omitting it reproduces 0008's non-expiring behavior.
- The algorithm is pinned server-side (`algorithms: ['HS256']`) — no `alg` negotiation, no confusion attacks.
- Unknown claims are ignored (forward compatibility for verified attributes later).

### 2. Surfaces

- SDK options renamed: `IdentifyOptions.token` / `GroupOptions.token` (the `signature` fields never shipped). The SDK holds a single `identityToken`, re-presents it on reconnect handshakes, and a `group()` token supersedes the `identify()` one.
- Wire fields: `SocketAuthData.identityToken`, `UpsertCompanyDto.token`.
- Verification points unchanged from 0008 §2 (handshake before `ensureBizUser`; per `group()` message). Verdict set, enforcement model, anonymous rule, and coverage stats all unchanged.
- **Console validator** (settings page): paste a token, get `valid / expired / invalid_signature / malformed / missing_subject` plus decoded claims — the diagnosability that bare hex could never offer.

## Consequences

**Good**

- One token mint per user replaces two hex digests; customer integration is simpler, with mature JWT libraries in every language.
- Failures are diagnosable (expired vs bad signature vs malformed), cutting support cost; the validator tool makes this self-service.
- The format is extensible without protocol breaks: more claims, `kid` headers, an asymmetric algorithm — all standard moves. We will not face the forced-migration end state observed in the wild.
- Optional `exp` lets security-sensitive customers bound token replay today.

**Bad / accepted trade-offs**

- Customers need a JWT library (vs one line of `crypto` stdlib for bare HMAC).
- Tokens are larger than hex digests (hundreds of bytes per handshake — negligible).
- `exp` adoption is opt-in, so most integrations will run non-expiring tokens; the replay posture is the customer's choice, as in 0008.

## Alternatives Considered

### A. Keep the 0008 bare-HMAC format

**Rejected because:** the only argument for it is minimal integration friction, which the minimal-claims JWT nearly matches — while the incumbent's trajectory demonstrates the terminal cost of the dead format, and the zero-cost switching window closes at release.

### B. Require `exp`

**Rejected because:** it forces every long-lived SPA session to implement token re-delivery before customers can adopt at all. Optional expiry keeps the on-ramp flat and lets posture tighten per customer.

### C. Asymmetric signing (RS256/EdDSA + JWKS)

**Rejected for now:** the signer is the customer's own backend and the verifier is us — a shared-secret model fits; public-key distribution adds ceremony without a second verifier to serve. The JWT container makes this a non-breaking upgrade if it's ever needed.

## Triggers to Revisit

- Demand for verified attributes in targeting → add signed claims (the container is ready).
- Customers needing more than two concurrent secrets → add `kid` headers instead of raising the slot cap blindly.
- Broad `exp` adoption plus reconnect-friction complaints → consider a server-issued continuation credential after first verification (the session-cookie shape).
