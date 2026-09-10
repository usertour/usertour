# 0013: CRM sync (HubSpot first)

- **Date:** 2026-09-03 (revised 2026-09-08 to match the implementation after three review rounds)
- **Status:** Accepted

## Context

ADR 0011 rebuilt integrations as outbound event push to analytics providers; ADR 0012 added inbound cohort sync. CRM integrations were deferred in both. A CRM integration is a third shape: two systems each own a copy of "the customer" (a HubSpot contact, a Usertour user) and the job is to keep chosen fields of the *same* person in step in both directions, plus to surface onboarding milestones on the CRM record. Neither the analytics adapter contract (`envelope → one HTTP request`) nor the cohort engine (membership batches → a segment) fits.

The legacy module deleted in ADR 0011 carried a HubSpot push: a private-app token as a bearer key, HubSpot custom events created from scratch on every send, errors swallowed. It has no reusable code; only two of its intentions survive re-examination (events out of Usertour, email as the bridge to a contact).

Platform facts that shape this decision, verified 2026-09-03:

- HubSpot is removing UI creation of private apps (new accounts 2026-09-28, existing 2026-10-26). Legacy public apps cannot be created since 2026-06-23. New apps are **project-based** (HubSpot CLI, `app-hsmeta.json`) and, for multi-account distribution, **OAuth**.
- Distribution ladder for an OAuth app: at most 10 allowlisted accounts while private; 25 installs once submitted for the App Marketplace; unlimited after listing approval.
- Timeline events on the current platform are **app events**: event types declared in the app project, occurrences posted to `POST /integrators/timeline/v4/events` with an idempotency `id`, usable in lists, workflows and reporting, no tier requirement on the customer's account — but the feature **requires HubSpot approval** (technology-partner form). Custom events (`events/v3`) need no approval but require the customer's HubSpot to be Professional or above.
- Change notification: the project `webhooks` component subscribes to property changes **per named property, statically**; the **v4 webhooks journal API** (beta) instead lets the app create per-installed-account subscriptions with a `properties` filter and pulls changes from a journal (3-day retention). Verified reachable for this app with a client-credentials token.
- OAuth access tokens live 1800 s; refresh uses the same token endpoint; `POST /oauth/{version}/token/introspect` yields the account id. The OAuth API is date-versioned (`HUBSPOT_OAUTH_API_VERSION`, one constant for token, introspect, revoke and the journal's app token); the unversioned v1 endpoints put secrets in the URL and are sunset on 2027-02-16.

The feature shape this decision commits to: an OAuth connection, an object mapping per HubSpot object ↔ Usertour object with a matching rule and a selected-property list in each direction, events written to the contact timeline, and **no creation of objects across the boundary**.

## Decision

### 1. Scope

**M1 (shipped on `feat/hubspot`):** OAuth connection; two mappings — contact ↔ user and company ↔ company; inbound property sync; outbound property write-back; full sync plus incremental in both directions; first-identify backfill; provider badge on synced attributes across the dashboard; a sync activity log.

**Events out** (timeline events, §8) shipped once HubSpot approved app events for the app (2026-09-09); no interim custom-events adapter was built before it (decision 2026-09-07 — one adapter, not two).

**M2 (ordered by value):** deals and custom objects; associated-object fields (e.g. company properties on the user mapping — the mapping model carries one remote object per mapping, so this needs a join field, not a flag); lists → segments (reusing the ADR 0012 engine); custom events as an enhancement for Professional+ accounts.

**Not in scope, by decision:** private-app tokens and account service keys as a credential mode; creating Usertour users or companies from CRM records; creating CRM records from Usertour; mapping outbound fields onto customer-owned CRM properties; an "all events" switch; a request-access door in the dashboard (the install cap is HubSpot's to enforce, and the Marketplace listing follows the production release).

### 2. Authentication and distribution

One OAuth public app, built on the project-based platform and versioned in `integrations/hubspot/` (outside the pnpm workspace, like the Zapier app). The project declares identity, scopes, redirect URLs, the logo and — once approved — app event types. Usertour Cloud uses the app deployed from that directory. **Self-hosted instances upload their own copy** to their own developer account (redirect URLs and secrets are bound to the app) and supply `HUBSPOT_CLIENT_ID` / `HUBSPOT_CLIENT_SECRET` through the environment; the server code path is the same, mirroring the per-project OIDC SSO configuration model (ADR 0007). The directory README carries the self-hosted procedure; the dashboard reads `configuredOAuthProviders` from the global config and, on a server without app credentials, replaces Connect with a pointer to it.

Scopes requested: `oauth`, `crm.objects.{contacts,companies}.{read,write}`, `crm.schemas.{contacts,companies}.{read,write}`, plus `developer.webhooks_journal.*` on the app-level token.

**The handshake.** `startIntegrationOAuth` (GraphQL, `IntegrationManage`, plan-gated) mints a signed 10-minute `state` (`tokenType: 'crm-oauth-tx'`, provider, environment, project, the user as `sub` — never `userId`, and the session strategy rejects any token that declares a `tokenType`) and sets it as an httpOnly, `SameSite=Lax` **transaction cookie on its own authenticated response**, scoped to the callback path; the browser then navigates to the provider's authorize URL (full-page, not a popup — the redirect chain crosses sites and returns to a server route). The callback, `GET /api/integrations/hubspot/oauth/callback`, is public but completes only when the cookie equals the `state` it receives. Anything reachable by URL — an authorize link, a start route — could be forwarded to a victim, whose account would then authorize into the attacker's environment; a cookie set by an authenticated response cannot be forwarded. Consequences: the callback must be served by the host the dashboard sends API requests to (Cloud: the API host; self-host: the same nginx; local development: the web dev server, proxied), and it lives under `/api` so every proxy in front of the server already routes it.

**Marketplace-initiated install.** The listing's "Install app" button sends the browser to the same callback before any consent, with `step=authorize` and a `returnUrl` (HubSpot's "partner sign in" variant — the only one that lets us learn the environment first). The callback redirects to the dashboard's install page (`/integrations/hubspot/install`, sign in + pick an environment), which runs `startIntegrationOAuth` with that `returnUrl`; the mutation sets the same transaction cookie but hands the state back on HubSpot's `returnUrl` instead of our authorize URL. HubSpot shows consent and returns with `step=finalize`, code, state and returnUrl; the callback verifies exactly as before and, on success, sends the browser to `returnUrl` (HubSpot then shows the app as installed) rather than the settings page. `returnUrl` is honoured only for `https://app[-<hublet>].hubspot.com` — anything else is an open redirect and is dropped. A finalize that reaches us without our state (listing configured without partner sign in) ends on the install page with an error, never in a HubSpot ↔ app redirect loop.

**One account, one environment.** A HubSpot account (portal) may be connected to one environment at a time; a callback for an account another connected integration holds is refused (`error=inUse`). Reconnecting with the same account keeps `remoteState` and reconciles the change subscriptions; reconnecting with a different account drops every link and counter, removes the previous portal's subscriptions unless another environment holds that portal by now, rebuilds subscriptions and starts a full round per mapping (recovery, not iteration — the exception to §7's "saving never starts a round").

### 3. Connection model

The connection is the existing environment-scoped `Integration` row (`provider = 'hubspot'`, unique per environment), so breaker state, entitlement, the outbound ledger and the message log are inherited. It gains:

```prisma
oauthCredentials String?   // AES-256-GCM: { accessToken, refreshToken, expiresAt }; null = disconnected
remoteAccountId  String?   // HubSpot account (hub) id — journal events and lookups key on it; survives disconnect
remoteState      Json      // system-owned: { account, properties (write-back properties created), journal.subscriptions }
```

`remoteState` is deliberately separate from the user-editable `config`, and it is written **per key** (`jsonb_set`, bound to `remoteAccountId`) by the two writers — the property cache and the journal bookkeeping — so they never clobber each other and an in-flight job cannot pollute a reconnect to another account. A connect writes it whole (kept on a same-account reconnect, reset on a different one).

**Holding an account means holding credentials.** `remoteAccountId` stays after a disconnect (bookkeeping: the next connect compares it to decide whether the links still point at the right records), so every path that acts on a portal — the in-use check, subscription reconciliation and removal, the journal poll, the scheduler, the sync jobs — keys on `oauthCredentials IS NOT NULL`, never on the account id alone.

Tokens are refreshed on demand before a delivery when within a safety margin of expiry, under a per-integration single-flight lock (TTL longer than the token request); the refresh re-reads under the lock, treats a cleared grant as revoked, and writes back with a compare-and-set on the ciphertext it refreshed from, so a disconnect or reconnect in between is never overwritten. A transient refresh failure counts as a delivery failure and feeds the breaker; a revoked grant (app uninstalled, authorizing user removed; a 401, or a 400 `invalid_grant`) is definitive and switches the integration off at once (`autoDisabledAt`, no retry ladder), surfaced on the settings page — routing that through the breaker's audit and email path is a follow-up alongside the breaker unification.

**Teardown.** Disconnect revokes the refresh token, removes the portal's subscriptions and clears the credentials, keeping the row (mappings and logs stay readable). Deleting the integration, and deleting its environment, first release provider-owned attributes, remove subscriptions and revoke the grant (`SyncTeardownService`, on `ENVIRONMENT_DELETING`); environment deletion validates primary/last **before** that event fires, because a revoked grant is not something a rollback restores.

### 4. Generic CRM layer: mappings, links, runs

Three tables carry no HubSpot assumptions; a second CRM provider reuses them unchanged.

```prisma
model IntegrationObjectMapping {
  integrationId     String
  remoteObject      String   // 'contact' | 'company' (provider vocabulary)
  localObject       String   // 'user' | 'company'
  matchStrategy     String   // 'email' | 'remoteField'
  matchRemoteField  String   // remote property compared: any email-typed property (default 'email'), or the one holding the Usertour external id
  inboundFields     Json     // [{ remote, local }]
  outboundFields    Json     // [{ local, remote }]
  fullSyncSessionId / fullSyncStartedAt (heartbeat) / lastFullSyncAt
  matchedCount / unresolvedCount
  @@unique([integrationId, remoteObject, localObject])
}

model IntegrationObjectLink {
  mappingId     String
  localId       String   // BizUser.id | BizCompany.id
  remoteId      String   // provider record id
  matchedBy     String   // 'email' | 'remoteField'
  lastSyncedAt  DateTime
  @@unique([mappingId, localId]) @@unique([mappingId, remoteId])
}

model IntegrationSyncRun {   // the sync activity log (§11)
  integrationId, mappingId?  // mapping SetNull: runs outlive their mapping
  kind      'full' | 'journal'
  status    'running' | 'succeeded' | 'failed'
  sessionId?, startedAt, finishedAt?, records, matchedCount, unresolvedCount, error?, remoteIds? (capped)
}
```

Interface constraints recorded now so the abstraction does not fossilize around HubSpot (a second provider has a Lead/Contact split, cannot always auto-create fields, and has no native timeline): one local object may carry several mappings; the match field is configured per mapping, never hard-wired to email; outbound fields support two modes — provider auto-creates the remote field, or the user picks an existing remote field; events-out is an optional adapter capability. No code is written for the second provider in this milestone. Naming and type mapping live in `@usertour/constants` so the server and the dashboard derive the same remote names.

### 5. Matching and creation

- Contacts match by **email** (the predefined `email` user attribute against any email-typed contact property, `email` by default) or by a **customer-designated contact property** holding the id passed to `usertour.identify()`. Companies match only by a company property holding the `usertour.group()` id. Email comparison is case-insensitive on both sides; external-id comparison is exact (Usertour external ids are case-sensitive).
- **Link, never create.** A link is established only when both records exist. Sync in any direction never creates a user, a company, a contact or a company record; unmatched records are counted (`unresolvedCount`) and re-evaluated on the next round. Rationale: a CRM is mostly leads and never-activated sign-ups; materializing them would flood the user list with session-less shells (the opposite trade-off from ADR 0012, whose cohort members are product users by definition).
- **First-identify backfill:** when `identify` creates a user (or `group` a company) in an environment with a mapping, or a user's email changes while unlinked, one targeted lookup by the match field links it and pulls inbound fields immediately, closing the gap until the next full round.
- A link whose remote record answers 404 on write-back is dropped (the record was deleted or merged away); the next round re-resolves.

### 6. Field ownership

`Attribute` gains `source` and `sourceId` (the remote property name), the same marker model `Segment` uses for cohort sync. Attributes are **project-wide** while mappings are per environment; ownership therefore belongs to the provider as long as **any** mapping of that provider in the project lists the attribute inbound (production and staging both connected is the common shape), and releasing a mapping only releases what no other mapping still syncs.

- **Inbound fields are provider-owned.** The attribute definition is created (or adopted) with the provider marker and rendered with the provider badge in user/company detail, attribute settings and the condition builder. SDK writes to a provider-owned attribute are dropped and logged; API writes are rejected. The attribute cannot be deleted, nor can its data type or object type be changed, while owned — the mapping releases it. Adopting an existing attribute of the same code name requires an explicit confirmation and an identical data type; a type mismatch refuses the mapping. **Predefined (system) attributes are never provider-owned**; `email` is the match key, not a synced field.
- **Outbound fields are Usertour-owned.** They are written to a provider property group named "Usertour" as `usertour_user_<codeName>` / `usertour_company_<codeName>`, created on demand (idempotent; recorded in `remoteState.properties`). Customer-owned properties are never targets. High-write attributes (last seen) are allowed with a warning in the editor.
- A field cannot appear in both lists of one mapping.
- **The owning side is authoritative:** an empty value at the owner clears the other side (writes `null`); nothing is "skipped to protect" the non-owner. Write-backs carry the field set, not values; values are read at delivery time.
- Type map: string/enumeration → String, number → Number, bool → Boolean, date/datetime → DateTime, multi-checkbox → List. Read-only and calculated remote properties are not selectable outbound.

### 7. Sync flows

| Flow | Trigger | Path |
|---|---|---|
| Full sync, both directions | "Run full sync" on the mapping card; the hourly scan enqueues mappings whose `lastFullSyncAt` is older than 24 h or null and whose round is not alive (below); a different-account reconnect. Saving a mapping never starts a round — mappings are saved repeatedly while being set up, and a round is the most expensive operation here; new activity follows the saved settings at once and existing records catch up on the user's or the daily round | page remote objects (100/page, only match + inbound fields); resolve identity and establish links; apply inbound fields via the canonical attribute path with `origin = provider`; batch write outbound fields for linked records; one queue job per page, each page enqueuing the next, worker concurrency 2, a 429 honoured via `Retry-After` on the shared delivery ladder (8 attempts, ~25 h); any other 4xx (bar 408) is a refusal, not a delay — the page job skips the ladder and the round closes at once with HubSpot's status, category and message as its error, read in the sync activity, and the daily scan tries again; one round per mapping at a time (`fullSyncSessionId`), a manual trigger during a live round returns "in progress" |
| Inbound incremental | v4 journal subscriptions per installed account and object type, `properties` filtered to the mapping's inbound fields plus the match field, reconciled after every mapping change and reconnect | one poller (30 s repeat job, a renewed Redis lease so ticks never overlap across instances) drains the app-level journal — one cursor for every account, up to 20 pages a tick; events are grouped per account and object type and applied per integration through the full-sync path; one account's failure is recorded as a failed run and does not hold the cursor; a revoked grant switches that account off; a provider rate limit stops the tick without moving the cursor (re-reading a page is idempotent, skipping it loses changes until the daily round) |
| Outbound incremental | user/company attribute change events | conditions: changed keys ∩ outbound fields ≠ ∅, a link exists, `origin ≠ provider`; a ledger message (`sync.object.update`) carries mapping, local id and the field set; the processor re-reads the values, ensures the remote property, then PATCHes by the link's remote id; a rate limit retries without feeding the breaker, a 404 drops the link and settles the message |
| Events | `BIZ_EVENT_TRACKED` | event in the integration's selected set and the user is linked (an unlinked user produces no message); ledger message with the event's own topic (`event.tracked.<codeName>`, the same envelope analytics deliveries carry); the delivery re-reads the selection, resolves the links, and posts one atomic batch of occurrences — the contact always, the linked company when the event carries one — with `timestamp = event time` and `id = ledger message id` (`-company` suffixed for the mirror); a 409 on retry is a delivery whose response was lost, not a failure |

**A round is alive while its heartbeat is fresh.** `fullSyncStartedAt` is set on claim, refreshed by every page and by every failed attempt that is going to retry, and cleared when the round closes (last page, attempts exhausted, a refused request, a stalled job, a revoked grant, a disabled integration). A round is presumed dead — taken over by the hourly scan, and no longer shown as running — only after a silence longer than `SYNC_ROUND_STALE_MS`, which is longer than any single wait a page job can take (the ladder's top rung and the `Retry-After` cap, both 12 h; a unit test pins the relation). A superseded round's run is closed as failed; a removed mapping closes its running run.

The journal is pull-based, so no public inbound URL is required — self-hosted instances on private networks sync incrementally too. The project's push `webhooks` component is therefore not used. Journal retention is 3 days; the daily full round is the correctness backstop, and a poller outage longer than the retention window simply falls back to it. Remote deletions do not touch Usertour records; cleared remote values write `null`.

### 8. Events out

Timeline events are **app events**: event types declared statically in the app project (`integrations/hubspot/src/app/app-events/*-hsmeta.json`) that become available in every installing account, and occurrences posted to `/integrators/timeline/v4/events/batch` under the `timeline.write` scope. HubSpot approved the app for app events on 2026-09-09 after the technology-partner request of 2026-09-03; the one generic type declared for customer-defined events (`event_tracked`) was refused as a catch-all and dropped — custom events (per-account, dynamic; Professional+ accounts) remain the M2 path for those.

The set is the eight milestones in `SYNC_TIMELINE_EVENTS`, each declared twice — once for contacts, once for companies (`<codeName>_contact` / `<codeName>_company`, since an event type's object type is fixed): flow started / completed / ended, checklist started / completed / task completed, question answered, launcher activated. Customer-facing names are sentence case, past tense, per HubSpot's review guidance; properties carry what a workflow or list filters on — content name and version, step or task name, question, answer and score, the Usertour user id, the page URL. `page_viewed` and step-level events are excluded and there is no "stream everything" switch: a CRM record is not an analytics sink. This is a declared exception to ADR 0011 §3 ("an enabled integration receives every tracked event"), scoped to sync providers. The analytics test event is refused for sync rows for the same reason.

Selection lives in the integration's `config.events` (`enabled`, `codeNames`), edited on the Timeline events card; turning the switch on without a selection selects every milestone, and the delivery re-reads the selection so deselecting stops queued deliveries too. Existing connections must re-authorize once for the added scope — a scope change is a versioned change of the app (§2).

### 9. Loop prevention

Three gates, each sufficient alone: inbound applies only properties in the inbound list (our own `usertour_*` write-backs never re-enter); outbound requires `origin ≠ provider` on the attribute change; a field cannot be in both lists.

### 10. Plan gate

New plan feature `crmIntegrations`: Cloud **Growth and above** (analytics providers stay on `integrations`, Starter+). Self-hosted mode forces it on together with `integrations`, `webhooks` and `customCss` — a self-hosted operator already has to register and upload their own app, and that effort should not be double-charged. Gate points: starting and completing OAuth, saving a mapping, starting a full round (manual, scheduled, or after a reconnect), each account in a journal tick, and the outbound listener. Entitlement is checked when a round starts, not per page — a plan that lapses mid-round finishes that round. A lapsed plan keeps configuration, read access and **disconnect**; syncing and deliveries stop. The plan comparison lists CRM integrations as its own row; the Marketplace listing states the plan requirement.

### 11. Dashboard

Settings → Integrations → HubSpot, one page of cards:

- **Connection card.** Unconfigured: a single Connect button (full-page redirect), or, on a server without app credentials, a pointer to the self-hosted setup. Connected: account domain, and a ⋮ menu with Reconnect and Disconnect (Disconnect stays available after a downgrade). Return parameters from the callback become toasts (connected / denied / in use / plan / failed); an auto-disabled integration shows a banner naming the cause and Reconnect as the remedy.
- **One card per object pair** (contacts ↔ users, companies ↔ companies), read-only: the match rule as `property = Email | User ID`, the inbound and outbound pairs as `source → target` rows with the provider and Usertour marks, and one status line — "Run a full sync to link the records that already exist" / running with live counts / last run with counts — with the Run full sync button and a question-mark tooltip carrying the long explanation. Edits happen in a dialog (match rule, then pick properties to add rows; New/Existing badges on the derived side; a churn warning on high-write attributes); the card polls while a round is live and shows skeletons, never the set-up state, on a cold load.
- **Sync activity card**: recent runs (`IntegrationSyncRun`) — time, kind and object pair, outcome with the error on hover, record count with the touched record ids on hover; polls while a run is running.
- **Write-backs**: the shared message log, titled for what it holds here (outbound deliveries only).
- **Timeline events card** (§8): a switch and the eight milestones as checkboxes, saved on every change; a hint when no contact mapping exists, since events are written to linked contacts only.
- Provider badges wherever an attribute name is shown (attribute settings, user/company detail, the condition builder and its summaries).

Header rule shared with the other integration pages: a configured card carries only a ⋮ menu on its title row; an unconfigured card carries one primary button.

### 12. Scale and limits

HubSpot allows 100–190 requests per 10 s per account. A 100k-contact account full-syncs in roughly 2,000 calls; the implementation relies on low worker concurrency and honouring `Retry-After` rather than a per-account limiter (see §14). Email matching queries users by a JSON attribute; a lower-cased expression index carries that lookup. The journal is one stream for every account: work per tick is proportional to the number of changes, and the scaling path is fanning buckets out to the queue.

### 13. Invariants

The rules the three review rounds kept tripping over, stated once; every reader and writer is held to them:

1. **A portal is held by credentials.** `oauthCredentials IS NOT NULL` is what makes an integration the holder of `remoteAccountId`; the account id alone means nothing. Subscriptions are touched only by the holder, or, for the sweep after a reconnect, only when nobody holds the portal.
2. **A round is alive while its heartbeat is within the stale window**, and the window outlasts any single wait a job can take. Nothing but the round's own session writes its counts or closes it.
3. **Errors are one of four kinds**, and each has one handling: transient (retry on the ladder; deliveries feed the breaker), rate limit (retry after the provider's delay; never the breaker; the journal halts the tick), revoked (off at once, round abandoned), final/skipped (settled, never retried).
4. **Ownership is project-wide and survives any one mapping**: an attribute stays provider-owned while any mapping of that provider in the project syncs it; predefined attributes are never owned; an owned attribute is neither deleted nor reshaped outside the mapping.
5. **`remoteState` is written per key and per portal**; nobody replaces the whole object except a connect.
6. **Teardown runs only after validation** — the grant revoke is the one step no rollback restores.
7. **The callback completes only for the browser that ran the mutation** (transaction cookie equals state); no route hands that cookie out.
8. **Saving never starts a round**; a different-account reconnect is the one automatic start, because it is recovery.
9. **Nothing crosses the boundary as a new object**; links are the only thing sync creates.
10. **Loops are impossible by construction** (§9), not by heuristics.
11. **A message topic names the message, not the recipient.** Same payload shape, same topic: an event delivered anywhere is `event.tracked.<codeName>`, a write-back from the object-sync engine is `sync.object.update` for every provider. No topic carries a provider or a provider class.

### 14. Known issues, accepted

- A page that fails after applying part of its records and then retries counts those records twice in the run's totals (counts are increments, not idempotent per page). Cosmetic.
- Incremental write-backs PATCH one record per message; only full rounds batch. A burst of attribute changes costs a request each.
- No per-account request limiter beyond concurrency 2 and `Retry-After`; a very large account can hit 429s and slow down rather than pace itself.
- `remoteState.properties` is a positive cache: a write-back property deleted on the HubSpot side is not recreated until the cache is cleared (a different-account reconnect) — eviction on the provider's "property does not exist" error is the fix when it is needed.
- External-id matching is exact-case on both sides; whether the provider's `IN` search is case-insensitive is untested.
- A revoked grant disables silently (settings banner only); audit and email arrive with the breaker unification.

## Alternatives Considered

- **Private-app token as the credential** (fits the analytics-provider "paste a key" model exactly): rejected — HubSpot is removing private-app creation weeks after this decision; service keys cannot authenticate webhooks; no timeline events; a multi-step setup that asks the customer's admin to create an app and copy a secret; and the Marketplace requires OAuth anyway.
- **Custom events as the primary events path**: rejected as primary — gated on the customer's HubSpot tier, so free and Starter accounts would receive nothing; kept as the interim path while app-event approval is pending.
- **Push webhooks component for incremental inbound**: rejected — subscriptions are static and per named property, incompatible with customer-selected fields, and require a public target URL. The journal API needs neither.
- **Lists → segments as the first inbound capability** (cheap via ADR 0012): rejected for M1 — property sync is the capability CRM users expect first (lifecycle stage, plan, industry as targeting attributes); list sync builds on it later.
- **Creating users from contacts when the match field carries the external id** (the ADR 0012 rule): rejected — CRM leads are not product users; shells would pollute the user list.
- **A relay through Usertour Cloud for self-hosted OAuth and webhooks**: rejected — routes CRM data through us and makes self-hosting depend on our cloud.
- **Gating the second CRM provider one tier higher**: rejected — one gate for the CRM class.

## Triggers to Revisit

- Journal API leaves beta or changes shape; retention or limits move.
- Marketplace approval (lift install limits; the listing needs three installs and the docs live first).
- The second CRM provider lands (the mapping/link abstraction gets its second implementation; any HubSpot-ism found then is fixed then).
- A known issue in §14 shows up in a customer account.

## Deferred

Breaker unification (one auto-disable path with audit and email, covering the revoked grant); deals and custom objects; associated-object fields; lists → segments; custom events as an enhancement; contact merge handling beyond link re-resolution; per-provider plan tiers; the §14 list.
