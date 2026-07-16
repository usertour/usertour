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
- Non-2xx / network errors **rethrow** so BullMQ retries: 5 attempts, exponential backoff from 1s. (A known competitor implementation swallows send errors in the worker, which silently disables its own retry policy — the delivery-log row is written in both branches here, and only the logging itself is allowed to fail soft, so a logging blip can't trigger a duplicate send.)
- Every attempt is a `WebhookDelivery` row surfaced in the dashboard detail page (topic, attempt #, HTTP status, duration, truncated error) — receivers' first debugging question is "did you send it and what did you get back."
- No auto-disable on repeated failure in M1 — there's a manual `enabled` switch and a visible delivery log; a circuit-breaker is a fast follow if real-world noise demands it.

### 7. SSRF

User-controlled URLs mount the shared egress guard (`common/egress`, built for this per its own charter): `assertPublicHttpUrl` fail-fast at create/update (HTTPS-only, no internal literals), `createGuardedHttpsAgent` + `guardedLookup` at send time (the actual boundary: DNS-rebinding pinning, IP-literal vetting). `ALLOW_PRIVATE_NETWORK_EGRESS` opts self-hosted deployments out, which is also the switch a local dev needs to test against a localhost receiver.

### 8. Management surface

M1 is dashboard GraphQL only (`webhooks.*` resolver family, `PermissionGuard` + `ScopeKind.Webhook` id→environment→project resolution, `@AuditWeb` on every mutation, secret auto-redacted by the audit snapshot policy). The v2 REST management endpoints + MCP tools follow in M2 on the same service layer.

## M2 (delivered 2026-07-16, same branch)

- **v2 REST management** (`/v2/projects/:projectId/environments/:environmentId/webhooks`, full CRUD + `POST :id/rotate-secret`) and **MCP tools** (`list/create/update/delete_webhook`) on the same domain service — one validation path, one secret lifecycle. `webhook:read/manage` joined the token-scope catalog and the env-targeted capability set (a webhook credential must name its environments). REST writes audit via the capability-prefix map; `POST` with a path id now derives `update`, not `create` (rotate-secret would otherwise masquerade as a create).
- **`content.published` config topic.** Emitted post-commit from `ContentService.publishedContentVersion` — the one funnel all three publish surfaces (web/REST/MCP) share — NOT from the audit event: audit `operation` strings differ per surface and its `publish` action collapses to `update` on REST, so keying off audit would be fragile. Thin payload (`data: {contentId, versionId}`). Prefix semantics were generalized to a fixed `WEBHOOK_PREFIX_SUBSCRIPTIONS` list (`event.tracked`, `content`) — still never arbitrary-segment.
- **Send-test-event**: dashboard mutation enqueues a single-attempt `webhook.test` message addressed to one endpoint (bypasses matching, not the enabled switch or egress guard); outcome lands in the delivery log.

## Deferred (M3+)

- `user.created/updated`, `company.*` topics. Groundwork confirmed: `BizService.upsertBizUsers` / `upsertBizCompanies` already diff (`isEqual` short-circuits no-op writes), so create-vs-update-vs-noop is already distinguished at the chokepoint. Remaining work: carry the signal out of the callers' transactions (post-commit emit, same collector problem event-tracking solved with AsyncLocalStorage), decide the seen-attribute exclusion (the per-event `updateSeenAttributes` writes must NOT fire the topic), payload = v2 `user`/`company` objects, UI groups.
- REST `GET /events` on the event-instance schema.
- Failure alerting / auto-disable (delivery log + manual switch cover today's need).

## Consequences

- Receivers integrate against one vocabulary: webhook `event` objects, topic names, and REST resources cross-reference by id with no translation layer.
- The topic namespace absorbs entity/config notifications later without migrating stored subscriptions.
- Per-attempt delivery rows cost storage (bounded by 30-day retention + `page_viewed` wildcard exclusion) in exchange for first-class debuggability.
- Local-dev delivery testing requires `ALLOW_PRIVATE_NETWORK_EGRESS=true` or a public receiver — documented cost of refusing private-network egress by default.
