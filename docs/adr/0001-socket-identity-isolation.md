# 0001: Socket identity isolation model

- **Date:** 2026-05-06
- **Status:** Accepted

## Context

The realtime SDK ↔ server channel uses Socket.IO with a single namespace (`/v2`). Identity is established at the WebSocket handshake via `auth: { token, externalUserId, externalCompanyId, ... }` and stored server-side in `socketData` (Redis-backed, keyed by `socket.id`).

The SDK already enforces a **connection-bound identity** along two dimensions:

- **Token change** → SDK disconnects and reconnects with the new token
- **`externalUserId` change** → SDK disconnects and reconnects (via `setAuth`'s `requiresReconnect` check)

A third dimension, **`externalCompanyId`**, is _not_ part of the connection-bound identity:

- `group()` does not trigger a reconnect; it sends an in-band `UpsertCompany` message that mutates `socketData.bizCompanyId` mid-connection
- Server-side `buildExternalUserRoomId(envId, externalUserId)` produces a room name that does not include company; sockets for `(alice, AcmeCo)` and `(alice, BetaCo)` share the same Socket.IO room, so cross-socket fan-out (session activation, content cancel, capacity check) does not isolate by company
- Most server-side handlers (track, start/end content, conditions, etc.) read identity from `socketData` rather than the message payload; only `UpsertUser` / `UpsertCompany` carry an `externalUserId` payload that can be cross-checked

This produces three theoretical concerns:

1. **Track-event attribution race** — a buffered `track` emit, sent before a same-tab `group()` switch but flushed after, would be attributed under the new company on the server (rare race; requires concurrent emits across the switch boundary)
2. **Multi-tab cross-company fan-out** — same user in two tabs with two different active companies would share a server-side Socket.IO room; a session activated in tab A could fan out to tab B (no race needed; requires the multi-tab + multi-company user pattern)
3. **Mid-flight identity switch leak** — `Promise.all`-style or stub-queue-dispatched `identify('u1') ... identify('u2')` could leave `u1`-bound emits in the Socket.IO `sendBuffer` that flush onto `u2`'s reconnected socket; non-upsert handlers would attribute them to `u2` (very rare; requires unusual call patterns)

There is no production evidence (customer report, monitoring anomaly, or reproducible case) of any of these concerns manifesting.

## Decision

Retain the current connection-bound identity model `(token, externalUserId)`. Do **not** extend it to `(token, externalUserId, externalCompanyId)` in v0.7.x.

Server-side defense-in-depth is added: `UpsertUser` and `UpsertCompany` handlers reject when the payload's `externalUserId` does not match the socket's authenticated identity. This is independent of any SDK-side change and is correct under all SDK versions.

The room-id call sites (`buildExternalUserRoomId` and its 5 consumers) are left as-is.

## Consequences

**What we keep:**

- `group()` remains a no-reconnect, in-band call — `group(c1) → group(c2)` does not interrupt active flows whose audience targeting still applies under the new company
- `toggleContents`, triggered on every `EndBatch`, re-evaluates content eligibility using the current `socketData`; flows whose hide-rules now match (e.g. "company != Acme → hide") are cancelled, and ones that don't are continued. This is the primary mechanism that makes (1) less impactful in practice
- Server-side fan-out (`server.in(room).emit(...)`) remains user-scoped, so multi-tab same-user same-company users continue to sync UI state across tabs

**Accepted limitations:**

- Track events emitted within the company-switch race window (concern 1) may attribute to the wrong `bizCompanyId`. Expected frequency: a few events per affected user per switch; impact: analytics noise
- Same-user-different-company multi-tab usage (concern 2) may see cross-tab session activations. Whether the SDK's local-side validation rejects these on the receiving tab is not verified
- A misbehaving SDK (or a tampered client) cannot cross identities on the upsert path (server guard catches it), but can on the non-upsert path (track, start/end, conditions, etc.) for the duration of one connection. The server cleans up `socketData` on disconnect

## Alternatives Considered

### Alt-A: Recreate the underlying Socket.IO instance on credential change

Replace the wrapped `io()` Socket entirely on `requiresReconnect`, discarding the `sendBuffer` along with it.

- **Costs:** wrapper-level bookkeeping (track listeners, manually re-bind on `recreate`, hold url/config to re-construct). The wrapper would shadow Socket.IO's own listener registry, creating two sources of truth that must stay in sync. Pending `emitWithAck` Promises tied to the old instance only resolve via their `EMIT_TIMEOUT` (30s), giving callers a long-tail failure mode
- **Rejected because:** the bookkeeping is bespoke wrapper code that mirrors library internals; this kind of code is brittle, and the underlying concern (3) is unverified

### Alt-B: Per-`(user, company)` Socket.IO namespace

Encode identity in the namespace path itself, e.g. `/v3/env:E/user:U/company:C`, using Socket.IO 4.x dynamic namespaces (regex match). Each tuple gets its own `Namespace` instance; identity becomes part of the WebSocket URL and is enforced by routing, not by application code.

- **Costs:** the gateway abstraction we use does not natively support dynamic namespaces — implementation would bypass the decorator-based routing for v3 and dispatch handlers manually. A service-layer refactor is needed so identity is sourced from a `RequestContext` rather than `socketData`/decorator-injected `socket`. Dynamic namespaces accumulate in the server's internal `_nsps` Map and must be explicitly removed when their last socket disconnects, or memory grows unbounded at scale. Identity also surfaces in load-balancer / proxy / CDN access logs
- **Rejected because:** large engineering scope without evidence of need at current scale; the memory-cleanup requirement is a runtime hazard that demands operational testing before rollout

### Alt-C: Per-message `sessionId` token

SDK regenerates a `sessionId` UUID on every credential change and includes it in every emit's payload. Server-side `WsGuard` (or middleware) at the gateway level rejects messages whose `sessionId` does not match the value captured at handshake.

- **Costs:** protocol-wide payload addition (~10 bytes per emit), one new server guard
- **Rejected because:** the engineering scope is moderate but the underlying concerns are still unverified; if evidence appears, this is the lowest-cost remediation and would be the preferred next step among Alt-A/B/C

### Alt-D: Extend `requiresReconnect` to include `externalCompanyId`

Add `setCompany(externalCompanyId): void` to the SDK socket service; treat company change as a credentials change → disconnect + reconnect.

- **Costs:** every `group()` switch becomes a network reconnect (~100–300 ms RTT). More importantly, a reconnect drops `socketData.flowSession` etc., and `initializeSocketData` does not re-hydrate them from session IDs (the SDK doesn't currently send those at handshake), so any in-progress flow that **should** continue under the new company (per its hide-rule audience) is interrupted
- **Rejected because:** this is a net UX regression for the common case (workspace switcher mid-onboarding) — `toggleContents` already handles the "should it stop?" question better than a blanket reconnect

## Triggers to Revisit

Reopen this decision when any of:

- A confirmed customer report or support ticket of cross-company / cross-user data attribution error
- Monitoring or analytics review surfaces a track-event volume anomaly correlating with company-switch timestamps
- The same-user-different-company multi-tab scenario surfaces as a real product pattern (not edge case)
- A new product / compliance requirement mandates strict per-tenant data isolation at the protocol level (e.g. enterprise SOC2 / ISO27001 audit findings, regulated-industry tenant)
- Scale point where per-user observability, rate-limiting, or routing become operational needs

Each trigger maps to a different best-fit alternative above; reassess with fresh evidence at that time rather than picking a path now.

## Implementation Sketch (if reopened)

If a trigger fires and Alt-D (extending `requiresReconnect` to include `externalCompanyId`) is the chosen path, the work spans both layers. This sketch is **not** a commitment — re-evaluate alternatives against the fresh evidence first.

**SDK** (`apps/sdk/`):

- `usertour-socket.ts`: extend `requiresReconnect` to also compare `externalCompanyId`; either grow `setAuth` to a third parameter or add a sibling `setCompany(companyId)` that funnels through the same reconnect path. The public API shape (`identify` / `group` are separate) suggests separate methods.
- `usertour-core.ts`: `group()` calls the new method synchronously (before the `await upsertCompany`) so concurrent `Promise.all([identify, group])` callers see consistent state for `ensureGroup`.
- `authCredentials` already supports `externalCompanyId` via the existing `SocketAuthData` type — no type change required.

**Server** (`apps/server/`):

- `utils/websocket-utils.ts:71`: `buildExternalUserRoomId(envId, externalUserId, externalCompanyId?)` appends `:${externalCompanyId}` when provided. Keep the no-company shape (`user:${envId}:${externalUserId}`) for backward compatibility within the deploy window.
- 5 call sites pass `socketData.externalCompanyId`:
  - `web-socket/v2/web-socket-v2.gateway.ts:66` (handshake capacity check)
  - `web-socket/v2/web-socket-v2.service.ts:958` (`cancelAllContentSessions`) — also requires Prisma `include: { bizCompany: { select: { externalId: true } } }` on the `bizSession.findMany`, then pass `session.bizCompany?.externalId` into the room id
  - `web-socket/core/content-orchestrator.service.ts:173, 1174, 1218` (session activation/cancellation fan-out) — destructure `externalCompanyId` from `socketData` alongside the existing fields
- `initializeSocketData`: add membership validation — `getBizCompany` currently fetches by `(externalCompanyId, environmentId)` without checking that the connecting `bizUser` is a member of that company. With company as a connection-level identity dimension, this should be enforced at handshake.
- `upsertBizCompanies`: drop the `socketData.externalCompanyId / bizCompanyId` mutation (handshake now sets these) — or keep it as an idempotent guard that validates the payload matches handshake.

**Cross-version deploy considerations:**

- Room names change shape, so during the rolling deploy window stale-version sockets will not fan-out to or from new-version sockets in the same `(env, user)` group. Acceptable for short windows; otherwise stage a transition release that joins **both** room name shapes for the same socket and emits to both.
- SDK clients in the wild (CDN-cached, unupdated tabs) keep using the old `(token, user)` reconnect pattern. They continue to work — the extended room id only changes server-side fan-out granularity, not the SDK's own protocol.

## Notes on the v0.7.1.3 perf scope

The v0.7.1.3 PR introduced the synchronous `setAuth` API. On re-examination, **the API change does not save round-trips** for the first identify:

```
Pre-refactor:  await connect()       → handshake RTT(s)
               await upsertUser()    → ack RTT
               total = handshake + ack

Post-refactor: setAuth() (sync)      → 0
               await upsertUser()    → emit queues in sendBuffer,
                                       flushed on connect → ack RTT
                                       arrives after handshake completes
               total = handshake + ack
```

`await upsertUser` waits for both handshake completion **and** ack in either model — Socket.IO's `sendBuffer` cannot deliver before the transport opens. The actual perf wins in v0.7.1.3 come from elsewhere:

- **`BeginBatch` fire-and-forget** (`sendClientMessage` no longer awaits the batch-open ack): saves one RTT per batch, since TCP/Socket.IO ordering guarantees the server processes `BeginBatch` before the next batched message on the same connection
- Server-side AsyncLocalStorage memo and `toggleContents` pre-fetch (shipped in v0.7.1.2): collapse the per-EndBatch query fan-out

`setAuth` itself is an **API ergonomics change** — synchronous return shape, callers don't compose around `await connect()`. The follow-up `connectingPromise → connecting flag + tracked listener` cleanup (commit `365ca4fc`) finishes that change by removing the `Promise<boolean>` wrapper whose resolved value no caller read.

This recategorization matters when reopening this decision: extending `setAuth` to include `externalCompanyId` (Alt-D) does not borrow from the same RTT budget the perf PR was working with — it's purely a correctness/scoping change with its own UX cost (in-progress flow interruption, see Alt-D rejection above).
