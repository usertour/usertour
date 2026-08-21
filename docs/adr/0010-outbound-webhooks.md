# 0010: Outbound webhooks

- **Date:** 2026-07-16
- **Status:** Accepted

## Context

Customers need Usertour-originated data pushed into their own systems as it happens — survey/NPS answers, flow and checklist lifecycle milestones — without polling the REST API. The data most in demand exists *only* in Usertour (a question answer, a checklist completion), so an outbound pipe is the only way to get it out in real time.

Two constraints shaped the design:

1. **The public contract must be one vocabulary.** The v2 REST API (ADR-adjacent `feat/api-token` work) established the external object shapes — camelCase, `object` discriminator, externalIds as public ids, `{results,next,previous}` envelopes. A webhook payload that invents a second dialect would double every receiver's mapping work. Webhook payloads therefore reuse the v2 object vocabulary, and every id they carry is directly usable against the corresponding v2 endpoint.
2. **The long-term product surface is a general outbound channel, not just a behavior-event stream.** Entity-change notifications (`user.updated`-class topics) and config-change notifications (`content.published`-class) are on the roadmap. The subscription model must give those a home without a data migration.

## Decision

### 1. Resource model: environment-scoped shared infrastructure

`Webhook` rows hang off an **environment** (`environmentId` FK; one environment, many endpoints), not off a user and not off a project:

- **Not user-owned.** A webhook is team data-pipeline infrastructure; it must survive its creator leaving. (Contrast `ApiToken`, which is correctly user-owned because it *acts as* that person — capability = owner's role ∩ scopes.) "Who can touch it" is RBAC (`webhook:read` / `webhook:manage`, OWNER-only tier); "who changed it" is the audit log — ownership carries neither.
- **Environment-scoped, single environment per endpoint.** The event stream itself is partitioned by environment (bizUser/bizSession/bizEvent all carry `environmentId`); an outlet coarser than its source would leak test traffic into production receivers. Single-environment (vs an `ApiToken`-style `allowedEnvironmentIds` array) was deliberate: it yields per-environment signing secrets (a leaked test secret can't validate production traffic), keeps the hot-path match a single indexed `WHERE environmentId = ?`, and "fan multiple environments into one URL" is served by creating one endpoint per environment.

`WebhookDelivery` is an append-only attempt log (one row per HTTP attempt, no `updatedAt`), retained 30 days and swept by a daily repeatable job.

### 2. Subscription model: namespaced topics

A subscription is a string list; the vocabulary is namespaced:

```
*                              all topics (noisy events excepted)
event.tracked                  all behavior events (noisy events excepted)
event.tracked.<codeName>       exactly that event
```

- **Why namespaced** (vs bare codeNames): user-defined custom-event codeNames share the value space with any future fixed notification names. `event.tracked.<codeName>` makes the codeName a *parameter segment* that can never collide with reserved topics (`user.updated`, `content.published`, …) — those namespaces are pre-reserved, aligned with the v2 `ApiObjectType` vocabulary, and slot in at M2 with zero migration.
- **Matching is namespace-prefix or exact — never segment-prefix.** Dashboard-created codeNames have no charset restriction (dots are legal), so `event.tracked.my` must not accidentally match `event.tracked.my.event`. The only prefix forms are the two fixed namespace subscriptions; everything else compares as a whole string.
- **Prefix subscription = future-proof opt-in**: `event.tracked` automatically includes event types added later, which is the semantics a category subscription should have.
- **Noisy-event carve-out**: `page_viewed` is orders of magnitude louder than the rest of the stream and is excluded from `*`/`event.tracked`; it delivers only when named explicitly (`WEBHOOK_NOISY_EVENTS` constant — extensible, currently one entry). This is the one guard that keeps "subscribe to everything" a sane default.
- M1 supports **all** behavior events (27 predefined + custom) — the pipeline is codeName-agnostic; narrowing it would have *added* code (a whitelist layer) while breaking the prefix-subscription promise.

### 3. Payload: thin envelope over v2 objects

```json
{
  "id": "whmsg_<hex>",
  "object": "webhookMessage",
  "type": "event.tracked.flow_started",
  "createdAt": "2026-07-16T08:00:00.000Z",
  "environmentId": "…",
  "data": {
    "event": {
      "id": "…", "object": "event",
      "codeName": "flow_started",
      "eventDefinitionId": "…",
      "userId": "u_123",
      "companyId": null,
      "sessionId": "…", "contentId": "…", "versionId": "…",
      "attributes": { "flow_id": "…", "flow_name": "…" },
      "createdAt": "…"
    }
  }
}
```

- `event` is the **event-instance** object — new v2 public vocabulary (`ApiObjectType.EVENT`), the definition/instance counterpart of `eventDefinition` exactly as `attribute-definitions` is to `user.attributes`. Field names align with `eventDefinition` (`codeName`), `eventDefinitionId` closes the loop to the event-definitions endpoint, `userId`/`companyId` are externalIds per v2 convention. A future REST `GET /events` reuses this schema/mapper.
- **Thin on purpose**: no embedded full user/content objects. Every id resolves against v2 REST; embedding snapshots would bloat every delivery for data most receivers don't need.
- `id` (= `messageId`) is **stable across retries** — the receiver-side idempotency key.
- `type` uses the same topic vocabulary as subscriptions, so receivers route on one word list.

### 4. Signature

`X-Usertour-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "{t}.{body}")>`

- Timestamp bound into the MAC → replay rejection is the receiver's documented 5-minute tolerance check with constant-time comparison.
- Per-endpoint secret, `whsec_` + 32-byte hex, server-generated, revealable and rotatable in the dashboard. The processor re-reads the row at send time, so a rotation applies to in-flight retries and a disabled/deleted endpoint silently drops them.
- The signed string **is** the wire body (stringified exactly once) — re-serialization would invalidate every signature.

### 5. Trigger pipeline

```
bizEvent row(s) created inside a domain transaction
  → transaction COMMITS
  → emit BIZ_EVENT_TRACKED { environmentId, bizEventIds } (in-process EventEmitter2)
  → WebhooksListener: re-read rows → match enabled endpoints' topics
  → one BullMQ job per (webhook × event), payload pre-assembled
  → WebhooksProcessor: sign → POST → record WebhookDelivery attempt
```

- **Post-commit emit is a hard rule** — subscribers must never observe rolled-back events. Prisma middleware was rejected outright (documented in `app.module`: middleware cannot intercept transactional operations).
- The emit fans out through the same in-process domain-event pattern the audit module established (`RESOURCE_CHANGED_EVENT`); future consumers subscribe without touching producers. Emit sites: `EventTrackingService` (all four public entrypoints, collecting created ids via `AsyncLocalStorage` — the handler chain rebuilds params objects in several places, so a threaded collector would silently drop), the v2 custom-event path, the legacy v1 `trackEvent`, and the two admin session-ending paths in `AnalyticsService`.
- **Ids, not rows, in the domain event**: the listener re-reads with the relations the payload needs; producers stay dumb.

### 6. Delivery semantics

- 10s timeout; `maxRedirects: 0` (a 3xx records as failure — predictable endpoint behavior, no redirect-chasing).
- Non-2xx / network errors **rethrow** so BullMQ retries: 8 attempts spanning ~24h (5s/1m/10m/1h/4h/8h/12h — a custom backoff strategy; a 429/503 `Retry-After` (the statuses RFC 9110 defines it for; other statuses are ignored so a header-happy intermediary can't stretch the ladder) raises the next delay, never lowers it, capped at 12h — deliberately the ladder's own max gap, so every legitimate backoff delay stays under the reconcile sweep's orphan threshold). Delivery-centric like the mainstream providers (which retry for 1-3 days): a receiver outage of up to a day self-heals with zero operator action, and between attempts the job sleeps in the Redis delayed set — no worker slot, no socket, just a ~KB job record. (2026-08-20; replaced the original 5-attempts/~15s ladder, whose recovery story leaned entirely on manual resend.) (A known competitor implementation swallows send errors in the worker, which silently disables its own retry policy — the delivery-log row is written in both branches here, and only the logging itself is allowed to fail soft, so a logging blip can't trigger a duplicate send.)
- Every attempt is a `WebhookDelivery` row surfaced in the dashboard detail page (topic, attempt #, HTTP status, duration, truncated error) — receivers' first debugging question is "did you send it and what did you get back."
- No auto-disable on repeated failure in M1 — there's a manual `enabled` switch and a visible delivery log; a circuit-breaker is a fast follow if real-world noise demands it.

### 7. SSRF

User-controlled URLs mount the shared egress guard (`common/egress`, built for this per its own charter): `assertPublicHttpUrl` fail-fast at create/update (HTTPS-only, no internal literals), `createGuardedHttpsAgent` + `guardedLookup` at send time (the actual boundary: DNS-rebinding pinning, IP-literal vetting). `ALLOW_PRIVATE_NETWORK_EGRESS` opts self-hosted deployments out, which is also the switch a local dev needs to test against a localhost receiver. Guarded deliveries also pin `proxy: false` (2026-08-20): axios silently honors HTTP(S)_PROXY/ALL_PROXY env vars, which would dial the proxy (what the agent+lookup then vet) and let the proxy resolve the target — voiding the guard; opted-out deployments keep axios defaults so proxy-dependent networks still deliver.

### 8. Management surface

M1 is dashboard GraphQL only (`webhooks.*` resolver family, `PermissionGuard` + `ScopeKind.Webhook` id→environment→project resolution, `@AuditWeb` on every mutation, secret auto-redacted by the audit snapshot policy). The v2 REST management endpoints + MCP tools follow in M2 on the same service layer.

### 9. Plan gate (added 2026-07-24)

Cloud: **Starter and above** (`PlanFeatures.webhooks`, first paid tier; overridable per subscription like the other booleans). Self-hosted: **never gated** — webhooks are a usage/feature limit, not an enterprise feature, so `getProjectConfig` forces the flag on there exactly as it does for `customCss` (self-host monetizes removeBranding / audit / SSO only).

Enforcement lives in the domain `WebhooksService`, which REST and MCP are thin over, so one gate covers every surface:

- **writes and actions** (`create` / `update` / `rotateSecret` / `sendTestEvent`) throw `FeatureRequiresLicenseError` (E0043 → 403 on REST, `[E0043]` on MCP);
- **delivery** consults the same entitlement before enqueueing (only paid by environments that actually have enabled endpoints — the lookup runs after the endpoint query, and is memoized per request scope), so a lapsed plan *stops firing* instead of keeping trial-era endpoints alive forever;
- **reads and delete stay open** so a downgraded project can still see and clean up what it configured. Rows are never deleted on downgrade; re-upgrading resumes delivery with the same endpoints and secrets.

The web settings page mirrors the gate (locked state → billing) and the pricing comparison table renders the row from the same matrix. Existing cloud projects on Hobby that created webhooks before this gate shipped keep their rows but stop receiving until they upgrade — acceptable because the feature launched behind the gate on the same branch (no grandfathering to honor).

### 10. Outbound delivery ledger (added 2026-07-24)

M1/M2 kept the message payload only in the BullMQ job (Redis) for the life of the retry sequence and logged per-attempt metadata (`WebhookDelivery`). That answered "did it go?" but not "what did we send?" or "what did they reply?", and made a manual re-send impossible once the job was gone. Replaced by a two-table ledger, shared with the integrations event push that follows this feature:

- **`OutboundMessage`** — one row per (destination × message): public message id (= payload `id`), `environmentId`, exactly one of `webhookId` / `integrationId` (CHECK constraint), `topic`, the `payload` as sent, `status` PENDING → DELIVERED | FAILED. Written by the producer **before** enqueueing (the record of intent exists even if the queue never runs it); the job carries the same payload as its working copy for the retry sequence.
- **`OutboundDelivery`** — one row per attempt, hanging off the message (not the destination): attempt number, status code, response-body excerpt (1 KB), error (500 chars), duration. Cascades with the message; the daily retention sweep (30 days) runs on messages only.
- **`OutboundLedgerService`** (`outbound/`) owns writes, status transitions (DELIVERED on success, FAILED when a failure exhausts the job's budget, otherwise stays PENDING), pagination and cleanup. Ledger writes swallow their own failures — a logging problem must never cause a duplicate send.
- **Resend** re-queues the stored payload under the same message id as a single attempt, numbering continuing after the logged tries (`attemptOffset`). The claim is a CAS keyed on the row's `updatedAt` as read (only DELIVERED/FAILED → PENDING **and** `updatedAt` unchanged, so a concurrent resend, an in-flight delivery, or a full settle-resettle cycle in between — the ABA case — loses instead of double-queueing) and stamps its own generation into `updatedAt`, which also keys the jobId (`resend-<id>-<claim stamp ms>`). An enqueue failure is treated as AMBIGUOUS (the connection can drop after Redis persisted the job): the service verifies by jobId first — a found job means the enqueue succeeded, keep the claim; only a verified miss rolls back, and the rollback is bound to the claim stamp so a delayed compensation can never undo a successor's claim. When the verify itself is unreachable the claim is rolled back anyway (Redis down for both calls ⇒ the job almost certainly was never created); the residual window stays within the documented at-least-once contract (receivers deduplicate on the message id). Gated like the other actions and only for enabled endpoints.
- Dashboard: the log is now per message (status, attempts, last response) with a detail dialog (payload as sent, every attempt with response/error, Resend). GraphQL `queryWebhookMessages` replaces `queryWebhookDeliveries`; `resendWebhookMessage` added.

Why the payload lives on the message and not on each attempt: the payload exists before the first attempt (enqueue time), duplicating it 5× would land exactly on failing endpoints, and message-level state (Resend, folding, a future reconcile pass) needs a message identity anyway.

Why generic now: integrations are the next feature on this branch and need the same bookkeeping (payload as sent, attempts, detail view, resend); transports stay per destination (webhook signer/poster vs. provider adapters), only the ledger is shared. The reconcile pass (re-queue PENDING messages after Redis loss) shipped with the circuit breaker — see §11.

## M2 (delivered 2026-07-16, same branch)

- **v2 REST management** (`/v2/projects/:projectId/environments/:environmentId/webhooks`, full CRUD + `POST :id/rotate-secret`) and **MCP tools** (`list/create/update/delete_webhook`) on the same domain service — one validation path, one secret lifecycle. `webhook:read/manage` joined the token-scope catalog and the env-targeted capability set (a webhook credential must name its environments). REST writes audit via the capability-prefix map; `POST` with a path id now derives `update`, not `create` (rotate-secret would otherwise masquerade as a create).
- **`content.published` config topic.** Emitted post-commit from `ContentService.publishedContentVersion` — the one funnel all three publish surfaces (web/REST/MCP) share — NOT from the audit event: audit `operation` strings differ per surface and its `publish` action collapses to `update` on REST, so keying off audit would be fragile. Thin payload (`data: {contentId, versionId}`). Prefix semantics were generalized to a fixed `WEBHOOK_PREFIX_SUBSCRIPTIONS` list (`event.tracked`, `content`) — still never arbitrary-segment.
- **Send-test-event**: dashboard mutation enqueues a single-attempt `webhook.test` message addressed to one endpoint (bypasses matching, not the enabled switch or egress guard); outcome lands in the delivery log.

- **Entity-change topics** (`user.created/updated/deleted`, `company.created/updated/deleted`): profile-sync notifications. Deletion (added 2026-07-24) is emitted from the two delete chokepoints (`deleteBizUser` / `deleteBizCompany`, which every surface funnels through) and carries the object as it was — the producer captures the row before the transaction since there is nothing to re-read afterwards. The BizService upsert chokepoints already diff (`isEqual` short-circuits no-op writes), so create-vs-update-vs-silent was free; the work was carrying the signal out of caller-owned transactions — a `BIZ_ENTITY_CHANGED` post-commit emit via an AsyncLocalStorage collector in BizService (`withEntityChangeEmit`), mirroring the event-tracking collector. Wrapped entry points: SDK identify/group (v1 + v2 sockets), REST users/companies upserts (wrapped inside `biz.upsertUser`/`upsertBizCompany`, so the integration cohort-sync path rides along), question-answered attribute binding (nested inside the event-tracking scope), and the socket-connect `ensureBizUser` (an empty-profile birth IS `user.created`, so the later identify reads as an update). The per-event `updateSeenAttributes` writes bypass the chokepoints entirely — no noise, no exclusion logic. Unwrapped callers are fail-safe: pushes outside a scope are no-ops (missed notification, never a premature one).
  Payload is deliberately NOT thin — `data.user`/`data.company` is the full v2 object (this topic's consumer wants the attributes, not a pointer), plus `data.previousAttributes` (the common payments-API convention) holding the old values of just the changed/removed keys, captured at diff time inside the transaction. The object snapshot itself is re-read at delivery time (freshest state; the message marks THAT a change happened, `previousAttributes` marks WHAT).

### 11. Failure handling: 24h ladder + two-layer breaker + reconcile (2026-08-20)

The first shipped breaker (2026-08-19) counted MESSAGES whose retry budget was exhausted and had the listener skip cooling endpoints — messages were not created, so a cooldown window silently ERASED events. Reworked the same day it was challenged: the availability of a receiver must never gate the LEDGER, only the delivery schedule.

- **Bookkeeping vs. delivery, split by module.** The listener owns SUBSCRIPTION gates only (enabled, plan entitlement): a message either belongs to a subscription or it doesn't. The processor owns AVAILABILITY: a cooling endpoint's jobs are parked (`moveToDelayed` to the window's end + up to 30s release jitter, consuming no attempt, no socket, no ledger row) — a receiver outage delays deliveries instead of erasing them. Manual sends (test event, resend — `manual: true` in the job data) pass the gate: the user IS the half-open probe, and their success resets the breaker for everything parked.
- **Layer 1 (cooldown) counts FAILED ATTEMPTS**, not exhausted messages: with the 24h ladder a message's final failure arrives a day late — far too slow a load-shedding signal. Threshold 10 consecutive failed attempts (across messages; any delivered attempt resets), window 1min doubling per further failure, capped at 1h. All the 2026-08-19 race discipline carries over unchanged: URL-bound increment/reset, streak-guarded cooldown arm, full-field reset guard (see docs/conventions/concurrent-state-writes.md).
- **Layer 2 (auto-disable) is unchanged in shape**: a streak older than 7 days (`failingSince`, stamped on 0→1, cleared by any success, floor-guarded against orphaned stamps) flips `enabled=false` + `autoDisabledAt`, records a `source: system` audit entry, and emails the project owner. Jobs still in the ladder then settle as final FAILED ledger rows (visible, resendable after re-enable) via the existing disabled-at-delivery drop path — not erased.
- **Reconcile sweep (hourly, `webhookReconcile` queue on the `outbound_cron` prefix)**: with retries living in Redis for a day, a Redis loss must degrade to "delayed up to the sweep cadence", never "stuck PENDING forever". `recordAttempt` now touches the message row on every attempt, and a cooldown defer touches it too (`ledger.touch`, gaps ≤ the 1h cooldown cap) — with the Retry-After cap pinned to the ladder max (12h), EVERY legitimate silence stays under the 14h orphan threshold (largest gap + slack), so silence past it genuinely means the job died with Redis. The sweep claims it (CAS on `updatedAt`, the resend discipline) and re-queues a continuation job (`attemptOffset` = logged tries, generation-keyed jobId). The rebuilt budget is derived, not assumed: test-event messages and messages with a DELIVERED attempt in history (the only way a delivered message is PENDING is an in-flight single-attempt resend) get 1 attempt; everything else continues the ladder's remainder. Rebuilt jobs are deliberately NOT `manual` — the manual cooldown bypass exists because the user is watching; an orphan swept hours later respects the gate like ordinary traffic. An enqueue failure after a claim is deliberately left alone: the claim only bumped `updatedAt`, so the row waits out one more window.
- Net receiver-facing contract: an endpoint outage under ~24h heals itself with zero intervention and zero loss; past 7 days of sustained failure the endpoint is disabled with an owner email, and messages stay resendable for the 30-day retention window.
- **Delivery does NOT re-check plan entitlement per attempt** (decided 2026-08-20): the listener gate stops NEW messages the moment a plan lapses, but messages created while entitled complete their ladder — a ≤24h tail, consistent with freeze-don't-destroy, with no abuse vector (a project receiving its own data at its own endpoint) and no per-attempt config lookup on the hot path.
- **Secret hardening (2026-08-20)**: the signing secret is AES-256-GCM encrypted at rest (shared `EncryptionService`, the EnvironmentSigningSecret/twoFactorSecret treatment; the domain service is the plaintext boundary, the processor decrypts its own Prisma read; no migration — the feature is unreleased, dev rows are rotated). On the v2 API, GET returns the secret only to tokens holding `webhook:manage`: the secret is the ability to forge signed deliveries, and a read-only token must not carry it.

## Deferred (M3+)

- `companyMembership` change topics (user joins/leaves a company).
- REST `GET /events` on the event-instance schema.
- ~~Circuit breaker / reconcile~~ → **shipped; see §11.**
- The listener re-queries webhooks + entitlement per emit with no cache (candidate for ProjectCacheService when volume warrants; the per-emit `environment.findUnique` inside `isEntitled` rides the same fix).
- Known-accepted small edges from the 2026-08-21 close-out review: `update()`'s breaker resets are read-decide-write (a user edit racing the worker in the same second can clear the evidence fields behind an auto-disable banner — cosmetic, the enabled/autoDisabledAt state machine itself stays guarded); a `moveToDelayed` rejection on the defer path burns one ladder attempt unrecorded (theoretical, no repro); polish deferred: per-attempt full-row webhook read in the processor, a redundant decrypt on mutating v2 paths, and the resend button's doubled log refresh. (The other 2026-08-19 ledger edge — one concurrently-deleted webhook failing the whole `createMany` batch by FK — is fixed: `createMessages` degrades a failed batch to per-row inserts and returns the persisted ids; the listener enqueues only those.)
- Integrations event push should subscribe to the same domain events (`BIZ_EVENT_TRACKED` etc.) and record into the outbound ledger rather than re-adding the commented-out call site.

## Consequences

- Receivers integrate against one vocabulary: webhook `event` objects, topic names, and REST resources cross-reference by id with no translation layer.
- The topic namespace absorbs entity/config notifications later without migrating stored subscriptions.
- The ledger costs storage — payload once per message plus a row per attempt (bounded by 30-day retention + `page_viewed` wildcard exclusion) — in exchange for first-class debuggability and re-send.
- Local-dev delivery testing requires `ALLOW_PRIVATE_NETWORK_EGRESS=true` or a public receiver — documented cost of refusing private-network egress by default.
