# 0011: Integrations (outbound event push to analytics providers)

- **Date:** 2026-08-25
- **Status:** Accepted

## Context

The repository has carried a dormant `integration` module since the early days: per-provider event push for six analytics/CRM providers, an inbound cohort-sync endpoint, and a Salesforce OAuth + object-mapping surface. It was never live — its only call site is a commented-out line in the deprecated v1 websocket gateway, and the settings menu entry was hidden. A full review (2026-08) concluded it cannot be revived:

- **Delivery loses data by design.** Each queue processor catches every error and logs it, which disables BullMQ's retry entirely — a provider outage or a bad API key silently drops events with no record. This is exactly the failure mode ADR 0010 §10 built the outbound ledger to prevent.
- **No visibility.** No delivery log, no failure signal, no breaker — a misconfigured key would fail forever, invisibly.
- **Security debt against current house standards**: provider API keys stored in plaintext (the codebase now encrypts secrets at rest, AES-256-GCM), credentials exposed unmasked through GraphQL, a `cuid()` used as a bearer token on a public inbound endpoint, an unsigned OAuth `state`.
- **Data-correctness bugs** in the provider payloads: destination-side dedup keyed on the event *name* (drops every repeat of an event), timestamps stamped at delivery time instead of event time.

Meanwhile the outbound webhooks feature (ADR 0010) shipped a delivery pipeline designed for exactly this second consumer: the `OutboundMessage` / `OutboundDelivery` ledger carries a `webhookId XOR integrationId` destination from day one, and ADR 0010's deferred notes say integrations should subscribe to the same post-commit domain events rather than resurrect the old call site.

## Decision

Delete the legacy module wholesale and rebuild integrations as a second transport over the shared outbound pipeline.

### 1. Scope

**This milestone:** outbound event push to five analytics providers — Amplitude, Heap, PostHog, Mixpanel, Segment. All five share one working shape: a fixed public HTTPS endpoint, a single API key (Heap's is an app id), an optional EU-region variant, and a JSON event payload.

**Explicitly deferred** (see Deferred below): inbound cohort sync, HubSpot, Salesforce, Zapier, custom/self-hosted provider hosts.

### 2. Resource model

`Integration` rows are environment-scoped shared infrastructure, same reasoning as ADR 0010 §1 (team data-pipeline config must survive its creator). One row per `(environmentId, provider)` — enforced by a DB unique constraint, not a frontend convention.

```prisma
model Integration {
  id            String   @id @default(cuid())
  createdAt / updatedAt
  environmentId String   + relation
  provider      String   // 'amplitude' | 'heap' | 'posthog' | 'mixpanel' | 'segment' (validated in the service)
  key           String   // provider API key, AES-256-GCM encrypted at rest (EncryptionService)
  config        Json     // provider extras: { region?: 'US' | 'EU' }
  enabled       Boolean  @default(false)
  consecutiveFailures / cooldownUntil / failingSince / autoDisabledAt   // breaker state, same shape as Webhook
  messages      OutboundMessage[]
  @@unique([environmentId, provider])
}
```

The legacy tables `Integration` (old shape), `IntegrationOAuth`, `IntegrationObjectMapping`, and `IntegrationLog` are **dropped, not migrated**: the feature was never reachable (hidden menu, dead call site), so existing rows are configuration that never took effect. `IntegrationLog`'s job is taken over by the shared ledger. The old `accessToken` column (a `cuid()` bearer for the inbound cohort endpoint) is dropped with the table; when cohort sync returns it will use a service-generated crypto-random token.

### 3. Trigger pipeline: second subscriber to the domain events

```
BIZ_EVENT_TRACKED (post-commit)
  → IntegrationsListener   (subscription gate: enabled + entitled)
  → OutboundLedgerService.createMessages (integrationId destination)
  → integration-delivery queue (one queue for all providers)
  → IntegrationsProcessor → adapter registry → provider HTTP call
  → ledger.recordAttempt / settle (unchanged CAS semantics)
```

- **Events only.** Integrations subscribe to `BIZ_EVENT_TRACKED` alone — analytics destinations consume event streams; `user.updated` / `content.published` class topics stay webhook-only.
- **No topic picker.** An enabled integration receives every tracked event (minus nothing — the noisy-event carve-out is a webhook-subscription concern; analytics tools want `page_viewed`). "Which events" is a webhook feature; an analytics destination's contract is the full stream.
- **Gate split as in ADR 0010 §11**: the listener owns the subscription gates (enabled + entitled), the processor owns availability (cooldown defers via `moveToDelayed` + ledger `touch`); the processor does not re-check entitlement.

### 4. Payload: canonical envelope in the ledger, provider format at the edge

`OutboundMessage.payload` stores the **same envelope `buildWebhookMessage` produces** for `event.tracked.<codeName>` (ADR 0010 §3) — not the provider wire body. The adapter transforms it at delivery time:

```
adapter: (envelope, plaintextKey, config) → { url, headers, body }
```

- The ledger UI shows one uniform message shape for webhooks and integrations alike.
- A config fix (region, rotated key) applies to in-flight retries — the processor re-reads the row per attempt, mirroring the webhook secret-rotation behavior.
- Adapters are pure functions, unit-testable without HTTP.
- Webhooks must store wire bytes because the signature is computed over them; integrations have no such constraint, so the canonical form wins.

Two legacy bugs are inverted into guarantees:

- **Event time, not delivery time**: adapters read the envelope's `createdAt`.
- **Idempotency at the destination**: providers with a dedup key (Mixpanel `$insert_id`, Amplitude `insert_id`) receive the **message id** — the ledger id is the delivery's idempotency key, so at-least-once retries dedup provider-side instead of colliding on the event name.

### 5. Delivery semantics: shared with webhooks

The ladder and breaker are transport-neutral and move to the outbound module (`outbound/delivery-backoff.ts`, formerly `webhooks/webhook-backoff.ts`): 8 attempts across ~24h, 429/503 `Retry-After` raises (never shortens) a rung, capped at the ladder top. The breaker is attempt-level with the same thresholds: cooldown defer-not-drop, 7-day auto-disable + audit entry + owner email, full CAS guards on every state write (`docs/conventions/concurrent-state-writes.md` applies).

The hourly reconcile sweep gains an integration arm: the ledger's orphan finder is parameterized by destination side, and orphaned `integrationId` rows are re-queued as continuation jobs into the integration queue with the same claim/budget discipline.

Manual sends: **"Send test event"** delivers a sample `event.tracked` envelope through the normal manual path (bypasses cooldown — the user is the probe; single attempt).

### 6. Security

- Keys AES-256-GCM at rest; the domain service is the plaintext boundary; the processor decrypts on its own read, with the same fail-loud handling as an undecryptable webhook secret (final failed attempt + breaker bookkeeping).
- **GraphQL never returns the key** — stricter than webhook secrets (a receiver needs the signing secret; nobody needs an API key echoed back). List/get return a masked tail (the key's last four characters, captured into its own column at write time) so the dashboard can show *which* key is configured without ever decrypting on the read path.
- All five destinations are fixed public HTTPS hosts baked into the adapters — no user-supplied URLs, so the egress guard is not engaged. If a custom-host option ever lands (self-hosted analytics instances), it must go through `assertPublicHttpUrl` + `guardedLookup`/agent + `proxy: false` per the egress charter.
- Outbound responses are truncated into the ledger under the existing caps; response bodies are acks, size-capped in the HTTP client.

### 7. Plan gate

`integrations: boolean` joins `PlanFeatures`, mirroring `webhooks` exactly: cloud unlocks at the first paid tier, self-hosted is never gated (`getProjectConfig` forces it on). Writes and actions throw `FeatureRequiresLicenseError`; the listener consults `isEntitled` before enqueueing; reads and delete stay open on downgrade so old configuration can be inspected and removed.

### 8. Management surface

M1 is dashboard-GraphQL only: list/get (masked), upsert (create-or-update per `(environment, provider)`), delete, enable/disable, send test event, and the destination's message log via the shared ledger connection. RBAC uses the existing `integration:read` / `integration:manage` capabilities. v2 REST / MCP exposure is deferred until there is demand — the service layer is shaped so those become thin wrappers, as with webhooks.

### 9. Frontend

The settings UI keeps the legacy interaction shape (catalog cards → per-provider config page) but is rewritten: catalog trimmed to the five real providers, copy describing only what exists (outbound event push), key input with masked display, region select where applicable, enable switch, test-event button, and the webhook message-log/status-badge components parameterized for integration destinations. The sidebar entry is unhidden when the rewrite lands.

## Consequences

- The dead module (~1.9k lines server-side plus the Salesforce mapping UI) and its four tables leave the codebase; `jsforce` leaves the dependency tree. Provider endpoint/payload knowledge survives as adapter functions.
- Upgrading a self-hosted deployment drops any rows in the legacy integration tables. Accepted: the feature was never reachable, so those rows never did anything.
- Delivery inherits webhooks' operational story wholesale: ledger visibility, retry ladder, breaker, reconcile, retention — no second bookkeeping dialect to maintain.
- The shared backoff module means a ladder change affects both transports deliberately and at once.

## Alternatives Considered

- **Repair the legacy module in place.** Rejected: every layer (fan-out, processors, schema, exposure) violates a current convention; the fix set is a rewrite with extra steps, and the dormant code has no users to protect.
- **Per-provider queues** (the legacy shape: six queue/processor pairs). Rejected: the transport differences live entirely in the adapter's request-building; one queue keeps concurrency, breaker wiring, and reconcile in one place.
- **Storing the provider wire body in the ledger** (what webhooks do). Rejected for integrations — see §4: webhooks sign wire bytes, integrations don't, and the canonical envelope buys uniform log display, retry-time config fixes, and pure adapters.
- **A topic picker per integration.** Rejected: an analytics destination's contract is the full event stream; per-event routing is what webhook subscriptions are for.
- **Migrating legacy rows into the new table.** Rejected: the columns don't line up (plaintext → encrypted key), and rows that never took effect carry no user intent worth preserving.

## Triggers to Revisit

- A provider whose auth or call shape breaks the single-key/single-call adapter contract (HubSpot's event-definition lifecycle, OAuth flows) — that lands as its own design, not as adapter special-casing.
- Demand for event filtering per destination, custom hosts, or REST/MCP management — each has a marked seam above.
- Delivery volume making the per-event listener reads or one-row-per-(event × integration) ledger growth a measured problem.

## Deferred

- **Inbound cohort sync** (analytics segments → Usertour segments): kept as a product concept; needs a crypto-random inbound token, batched upserts, and its own design pass.
- **HubSpot**: requires private-app tokens/OAuth (API-key auth is sunset) and an event-definition lifecycle (define once, not per send); different auth shape than the five.
- **Salesforce**: object sync is a different feature (mapping UI + sync engine); the legacy OAuth/introspection/mapping code was deleted with the module and a future build starts from a design, not from that code.
- **Zapier**: rides on outbound webhooks — a platform-side app subscribing via the public API; no server-side provider code needed.
- **Custom provider hosts** (self-hosted analytics): egress guard + proxy rules per §6 when it comes.
