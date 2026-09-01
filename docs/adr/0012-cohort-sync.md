# 0012: Inbound cohort sync (analytics segments → Usertour segments)

- **Date:** 2026-08-27
- **Status:** Accepted

## Context

ADR 0011 rebuilt integrations as an outbound pipeline: Usertour events stream into analytics providers. The reverse direction — segments defined in an analytics tool driving Usertour targeting — was deferred. It is a differentiated capability: a cohort built on product analytics ("power users who never opened the checklist") becomes a targeting audience for flows and checklists without re-modeling the condition in Usertour.

The providers expose this through three different mechanisms, with very different entry costs:

- **Mixpanel**: a user-configured *Custom Webhook* — Mixpanel POSTs cohort membership changes to a URL the customer pastes in. No partnership required.
- **Amplitude**: a self-serve *Cohort Webhooks* destination — the customer adds a Webhook destination (Data → Destinations → Cohorts) pointing at our receive URL and syncs cohorts to it. No partner registration; the same URL-token model as Mixpanel.
- **Heap**: a partner OAuth connection; the customer toggles sync per segment inside Heap. Requires registering for Heap's Integrations Partner program.

The mechanisms differ only in **entry and authentication**. What happens after — mapping a source cohort to a segment, resolving member identities, applying membership changes — is identical.

## Decision

### 1. Scope

This milestone ships the **provider-agnostic sync engine with the Mixpanel and Amplitude entries** (both self-serve webhook models). Heap plugs in later as an additional entry adapter once its partner registration comes through; the engine contract is designed for that from day one.

The Amplitude wire is leaner than Mixpanel's: one flat JSON body per batch — `cohort_id`, `cohort_name`, `in_cohort` (true = entered, false = exited), and a `users` array of `{ user_id }` objects — with **no full-roster action**: membership is maintained purely through enter/exit batches, so the replace-round machinery stays unused. Amplitude retries on timeout and may re-deliver a batch; the engine's set-based writes absorb replays. The identity default is `user_id` (their identify value), with the same `userIdProperty` override; customers whose payload template diverges can also fix it Amplitude-side, since the webhook body is a customizable template.

### 2. Architecture: one engine, per-provider entries

```
Mixpanel Custom Webhook ─┐
Amplitude destination ───┤→ entry adapter (authenticate + parse → CohortSyncBatch)
Heap partner webhook ────┘        ↓
                          sync engine (provider-agnostic)
                                  ↓
                          Usertour Segment
```

Entry adapters normalize provider payloads into one contract:

```ts
CohortSyncBatch {
  integrationId: string
  source: { cohortId: string; cohortName: string }
  action: 'add' | 'remove'
  members: Array<{ externalUserId: string }>
}
```

The engine never sees provider-specific shapes — the same layering discipline as the outbound side (shared ledger, per-provider adapters).

### 3. Data model

`Integration` grows an inbound side (the slot reserved when the legacy `accessToken` column was dropped in ADR 0011):

```prisma
inboundEnabled   Boolean @default(false)  // independent of the outbound `enabled`
inboundToken     String?                  // AES-256-GCM at rest — the UI re-displays it
inboundTokenHash String? @unique          // sha256 lookup column (ciphertext is not queryable)
inboundConfig    Json    @default("{}")   // { userIdProperty?: string }
```

The token is minted on FIRST inbound enable (not at integration creation), so rows that never used inbound carry none. Rotation regenerates both columns in one transaction; the old URL's hash then finds nothing → 404.

A new mapping table holds sync metadata — deliberately NOT columns on `Segment` (mapping state is integration-domain, and one structure serves all future providers):

```prisma
model IntegrationSyncedSegment {
  id / createdAt / updatedAt
  integration      Integration @relation(...)             // integrationId — onDelete: Restrict
  sourceCohortId   String
  sourceCohortName String
  segment          Segment @relation(..., onDelete: Cascade) // segmentId — indexed, NOT unique
  lastSyncedAt     DateTime?
  memberCount      Int @default(0)   // this ENVIRONMENT's bridged members, not the segment total
  unresolvedCount  Int @default(0)   // members with no extractable user id (skipped)
  /// Full-roster round state ("members" action, paged): set on the round's
  /// first page, cleared after the final page's stale-member cleanup.
  fullSyncSessionId String?
  fullSyncStartedAt DateTime?
  @@unique([integrationId, sourceCohortId])
}
```

**A cohort converges onto ONE segment per project.** Segments are
project-scoped while integrations (and users) are environment-scoped, so the
same cohort synced from several environments must not mint sibling segments:
content targeting references the segment id across environments, and a
per-environment segment would silently target nobody outside its home
environment. Mechanically: `segmentId` is indexed but NOT
unique — one mapping per (integration, cohort), several mappings may feed one
segment. Segment lookup on first contact goes by the pre-existing
`(projectId, source, sourceId)` columns, backed by a unique index (internal
segments carry NULL `sourceId` and never collide) that also makes
cross-environment first-sync races converge instead of duplicating. Each
mapping only ever touches members its own environment bridged: the identity
bridge resolves against the integration's environment, the replace cleanup is
bounded to it, and `memberCount` reports that environment's contribution.

The FK policies are deliberately asymmetric. `segmentId` cascades: deleting a
synced segment takes ALL its mappings with it (a mapping without a segment is
meaningless); continued provider pushes then recreate the pair — documented.
`integrationId` RESTRICTS: deleting an integration must first run the
service-layer *release* transaction (per mapping, atomically: delete the
mapping row, then reset `Segment.source` to 'internal' ONLY when no other
mapping still feeds the segment — a sibling environment's sync keeps it
synced). A cascade here would silently leave segments stranded with a
provider badge and no mapping. Fail-loud over half-orphans.

The materialized segment itself needs no schema change: it is a `MANUAL`
segment whose members are ordinary `BizUserOnSegment` rows (the existing
`@@unique([segmentId, bizUserId])` is what makes batch writes idempotent),
and the pre-existing `Segment.source` / `sourceId` columns (default
'internal') carry the provider marker for badge rendering — display-only;
the mapping row is the single source of truth for logic.

### 4. Identity bridging: zero-config by default

Our own outbound pipeline sends the user's externalId as the provider's `distinct_id` — for customers using it, the two sides already agree. The engine therefore matches `distinct_id` against `BizUser.externalId` by default; `inboundConfig.userIdProperty` is an **optional override** for customers whose provider identities diverge (they name the exported property carrying the externalId). No mandatory setup step.

One divergence source deserves explicit documentation: with Mixpanel's Identity Merge, the canonical `distinct_id` Mixpanel picks for a merged profile may be a pre-login device id rather than the value passed to `identify()`. Customers hitting this get segments full of device-id users nobody will ever match in-product — the fix is naming `$user_id` (present on every member, verified against a live payload) in `userIdProperty`. The field's help copy and the docs page must spell this out.

**Members with no existing user are CREATED as bare users** — externalId only, and cohort sync **never writes attributes**, at creation or later. Both halves were settled against live experiments:

- *Why create*: a cohort's whole point is reaching users before they first appear in-product (the canonical use: circle dormant users in the analytics tool, greet them on their next visit). Skipping unknown members quietly breaks that flagship scenario; creating them costs visible, explainable things (quota, list rows) instead of a hidden feature failure. When the SDK later identifies the same externalId, it is simply the same user. A `remove` never creates (deleting an absent member is a no-op).
- *Why no attributes, ever*: the wire does carry profile data (a captured live payload showed full People properties — geo, timestamps, custom keys — per member), but consuming it grows a rules matrix (two key shapes per property, `$`-prefix collisions, allow-lists, empty-string filtering) for a thin payoff: targeting rides the segment itself, and first-party data arrives with the first `identify()`. Attributes keep exactly one authority — the SDK / API — and the parser keeps its PII discipline: everything but the identity field is dropped unlogged.

**Members whose wire object yields no user id are skipped and counted** (`unresolvedCount`, surfaced in the UI). With creation in place this is the one failure mode left, and it means misconfiguration — typically a `userIdProperty` not included in the exported properties, which otherwise makes the sync silently produce nobody. The count is the customer's only signal.

### 5. Sync semantics

- Membership materializes into the **existing segment machinery**: the engine writes plain `BizUserOnSegment` rows on an automatically created segment, so targeting evaluation, the Users page, and content conditions all work unchanged. The mapping row (`IntegrationSyncedSegment`) is what marks that segment as a mirror. (The alternative — keeping cohort membership in its own table and adding a new targeting-condition type — is recorded under Alternatives.)
- The mapping row is found-or-created by `(integrationId, sourceCohortId)`; creating it finds the cohort's project-wide segment by `(projectId, source, sourceId)` or creates it (named after the cohort, marked as synced). `sourceCohortName` follows renames.
- **Replace cleanup is environment-bounded**: a full-roster round's final page only reaps members the round's OWN environment bridged — other environments feed the same segment on their own schedules and are never each other's "stale" members.
- Membership writes are **set-based and idempotent**: adds use `createMany … skipDuplicates` (plus an updatedAt touch on the batch), removes are a bulk delete; a retried or out-of-order batch cannot corrupt state.
- **Full-roster batches implement replace, not add-only.** Mixpanel sends `action: "members"` (the complete roster, paged, one round grouped by `mixpanel_session_id`) not just on first sync but after errors and snapshot expiry — treating it as add-only would leave stale members forever. The mapping row carries the round state (`fullSyncSessionId`, `fullSyncStartedAt`); after the final page (`page_count == total_pages`) members untouched during the round are bulk-removed. Out-of-order pages self-heal: a late page re-adds its members (eventual consistency within one round), and a retried page after cleanup is a plain idempotent add.
- **Synced segments are read-only in Usertour** — no member adds AND no member removes. Bare deletion would be a false affordance: the next full export re-adds the member, since replace semantics restore whatever the provider's roster says. A remove capability is only honest with an exclusion memory ("tombstone": `segment = cohort ∩ not-excluded`) — recorded as an incremental enhancement (an exclusion sub-table consulted on add), to be built if excluding individual users proves a real need. Until then, excluding a specific person is expressed through targeting conditions on a unique attribute.
- Processing is **synchronous in the request** (bulk SQL keeps thousand-member batches in the low milliseconds). A failure returns 5xx and the provider retries; idempotency makes that safe. No queue, and inbound traffic does **not** enter the outbound ledger — the direction's observability lives on the mapping row (`lastSyncedAt`, counts).

### 6. Lifecycle

- **Inbound switch off / plan lapsed**: the endpoint refuses (403). The failure is visible in the provider's own delivery log; synced segments stay frozen.
- **Cohort deleted (or webhook removed) provider-side**: no signal reaches us — the segment remains, `lastSyncedAt` goes stale, and the UI shows it. No speculative expiry.
- **Integration (or mapping) deleted**: the segment is **released as an ordinary segment**, not deleted — it may be referenced by content targeting; destroying it would break live configuration. The synced badge and read-only state drop away.
- **Token rotation**: immediate; the old URL 404s. The confirm dialog reminds the user to update the URL in the provider.

### 7. Endpoint and token discipline

`POST /inbound/mixpanel/:token` on a dedicated `@Public` controller — the token must ride in the URL because Mixpanel's Custom Webhook configures a URL and nothing else. Not part of the v2 REST surface (that is the api-token auth domain).

- Token: `utin_` + 32 random bytes (hex), generated server-side on first enable; constant-time comparison via the sha256 lookup column; encrypted at rest for re-display; rotatable.
- Response contract follows Mixpanel's spec: a JSON body `{action, status: "success" | "failure", error?}`. Status-code choice is driven by Mixpanel's retry semantics — **any 4xx permanently pauses the sync**, 5xx/429 retry and re-run next cycle. Therefore: invalid token → 404 (a rotated-away URL SHOULD die permanently); disabled inbound switch / lapsed plan → **503** (recoverable refusal: re-enabling resumes automatically on the next cycle, and the failures remain visible in Mixpanel's log). Never a fake 2xx.
- Member payloads may carry exported PII properties: the adapter extracts the identity field and **discards the rest, unlogged**.
- Request-size and batch-size caps; oversized requests are refused.

### 8. Documentation obligations (paid for in field testing)

Three provider realities must be spelled out in the guide and the field help
copy — each cost a debugging session to discover:

- **Cohort export only carries members with a Mixpanel People profile.**
  Event-only users count toward the cohort's size but export as zero
  ("Succeeded / 0 users"). Customers using only our outbound stream (which
  never calls `people.set`) will see empty syncs by design.
- **`userIdProperty` and Mixpanel's PROPERTIES TO EXPORT are a pair**: a
  named property must also be checked for export, or every member arrives
  without an identity field.
- **Identity Merge** can make the canonical `distinct_id` diverge from the
  `identify()` value — the dedicated-property override exists for this.

Implementation rule: a configuration field's default or prefill must never
be derived from another credential field — a wrong prefill poisons the
generated setup instructions downstream and reads as authoritative.

### 9. Plan gate and permissions

Rides the existing `integrations` entitlement (cloud Starter+, self-hosted never gated) and the `integration:read/manage` capabilities. Downgrade: endpoint refuses, dashboard shows the standard degraded banner.

### 10. Dashboard

- The provider identity card gains a second switch row: cohort sync (immediate commit, mirrors the outbound row; first enable mints the token).
- An inbound capability card alongside the outbound one: the receive URL (read-only, copy, rotate), our own setup copy, the optional user-id property, and the **synced-cohort list** (name, member count, unresolved count, last sync, link to the segment).
- Segment surfaces show a synced badge; member editing is disabled for synced segments.

## Alternatives Considered

- **Per-provider sync pipelines** (the legacy module's shape): rejected — the only true differences are entry and auth; N engines would drift.
- **Cohort membership as a separate data dimension + a new targeting-condition type** (how several messaging/onboarding products model it — the cohort appears as a segment-builder filter or a boolean user property, and users compose their own segments from it): structurally elegant — "can I edit it" stops being a question, because the synced data is raw material and every segment stays user-owned. Rejected *for this milestone* on cost: it touches the targeting-condition schema and both evaluators, whereas materializing a read-only segment reuses the manual-segment machinery end to end. Industry survey note: no surveyed product lets users hand-edit synced membership; the disagreement is only in packaging.
- **Polling the provider's query API instead of receiving webhooks** (a service account could list cohorts and page through members, making setup one-sided): rejected for this capability — webhooks hand the expensive parts (incremental diffs, scheduling, retries) to the provider, need only a low-sensitivity URL token instead of high-privilege read credentials, and match how every provider's own cohort-export channel is designed. Revisit if a service-account credential ever arrives for the data-sync capability.
- **Mandatory user-id property configuration**: rejected — our outbound alignment makes `distinct_id` correct by default; a required setup step would be friction that mostly re-enters the default.
- **No-add-but-bare-delete** (member adds blocked, deletes allowed with no exclusion memory): rejected — such deletions resurrect on the next full export; a delete affordance without exclusion memory is a false promise. Either full read-only (chosen) or delete-with-tombstone (enhancement path), nothing between.
- **Skipping unknown members instead of creating them** (this ADR's initial ruling): reversed — it silently breaks the circle-then-greet scenario the feature exists for; the skip-count survives only for members with no extractable id.
- **Writing member attributes onto users** (at creation and/or continuously, optionally behind a config switch): rejected — a second write authority for user attributes invites stale-snapshot overwrites of first-party data, and the mapping rules it needs outgrow the value; attribute ingestion belongs to a future profile-sync feature with an explicit authority declaration.
- **Deleting the segment with the integration**: rejected — live targeting may reference it; releasing it as an ordinary segment breaks nothing.
- **Queueing inbound batches / recording them in the outbound ledger**: rejected — synchronous idempotent processing is simpler, provider retries supply the durability, and the ledger's semantics (our deliveries outward) don't fit inbound traffic.

## Triggers to Revisit

- Heap partner registration landing — an entry adapter (OAuth connection + Heap-Hash callback validation + per-segment toggles) against the same engine.
- Batch sizes or provider timeouts outgrowing synchronous processing.
- Demand for company-level cohort sync (current scope is user cohorts).
- A future data-sync capability introducing provider service accounts — then cohort *selection* could move in-app (list cohorts via the API, pick them here) and the condition-type model above becomes worth its cost.

## Deferred

- The Heap entry (partner-gated, see Triggers).
- Full-membership reconciliation (a periodic pull to heal drift) — requires provider read APIs and credentials beyond the webhook push model.
