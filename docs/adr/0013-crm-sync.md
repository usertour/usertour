# 0013: CRM sync (HubSpot first)

- **Date:** 2026-09-03
- **Status:** Accepted

## Context

ADR 0011 rebuilt integrations as outbound event push to analytics providers; ADR 0012 added inbound cohort sync. CRM integrations were deferred in both. A CRM integration is a third shape: two systems each own a copy of "the customer" (a HubSpot contact, a Usertour user) and the job is to keep chosen fields of the *same* person in step in both directions, plus to surface onboarding milestones on the CRM record. Neither the analytics adapter contract (`envelope → one HTTP request`) nor the cohort engine (membership batches → a segment) fits.

The legacy module deleted in ADR 0011 carried a HubSpot push: a private-app token as a bearer key, HubSpot custom events created from scratch on every send, errors swallowed. It has no reusable code; only two of its intentions survive re-examination (events out of Usertour, email as the bridge to a contact).

Platform facts that shape this decision, verified 2026-09-03:

- HubSpot is removing UI creation of private apps (new accounts 2026-09-28, existing 2026-10-26). Legacy public apps cannot be created since 2026-06-23. New apps are **project-based** (HubSpot CLI, `app-hsmeta.json`) and, for multi-account distribution, **OAuth**.
- Distribution ladder for an OAuth app: at most 10 allowlisted accounts while private; 25 installs once submitted for the App Marketplace; unlimited after listing approval.
- Timeline events on the current platform are **app events**: event types declared in the app project, occurrences posted to `POST /integrators/timeline/v4/events` with an idempotency `id`, usable in lists, workflows and reporting, no tier requirement on the customer's account — but the feature **requires HubSpot approval** (technology-partner form). Custom events (`events/v3`) need no approval but require the customer's HubSpot to be Professional or above.
- Change notification: the project `webhooks` component subscribes to property changes **per named property, statically**; the **v4 webhooks journal API** (beta) instead lets the app create per-installed-account subscriptions with a `properties` filter and pulls changes from a journal (3-day retention). Verified reachable for this app with a client-credentials token.
- OAuth access tokens live 1800 s; refresh uses the same token endpoint; `GET /oauth/v1/access-tokens/{token}` yields the account id.

Every mature onboarding product surveyed ships the same feature shape: OAuth connection, an object mapping per HubSpot object ↔ product object with a matching rule and a selected-property list in each direction, events written to the contact timeline, and — uniformly — **no creation of objects across the boundary**.

## Decision

### 1. Scope

**M1:** OAuth connection; two mappings — contact ↔ user and company ↔ company; inbound property sync; outbound property write-back; timeline events (app events once approved, see §8); full sync plus incremental in both directions; first-identify backfill; provider badge on synced attributes across the dashboard.

**M2 (ordered by value):** deals and custom objects; associated-object fields (e.g. company properties on the user mapping); lists → segments (reusing the ADR 0012 engine); custom events as an enhancement for Professional+ accounts.

**Not in scope, by decision:** private-app tokens and account service keys as a credential mode; creating Usertour users or companies from CRM records; creating CRM records from Usertour; mapping outbound fields onto customer-owned CRM properties; an "all events" switch.

### 2. Authentication and distribution

One OAuth public app, built on the project-based platform and versioned in `integrations/hubspot/` (outside the pnpm workspace, like the Zapier app). The project declares identity, scopes, redirect URLs and — once approved — app event types. Usertour Cloud uses the app deployed from that directory. **Self-hosted instances upload their own copy** to their own developer account (redirect URLs and secrets are bound to the app) and supply `HUBSPOT_CLIENT_ID` / `HUBSPOT_CLIENT_SECRET` through the environment; the server code path is the same, mirroring the per-project OIDC SSO configuration model (ADR 0007). The directory README carries the six-step self-hosted procedure.

Scopes requested: `oauth`, `crm.objects.{contacts,companies}.{read,write}`, `crm.schemas.{contacts,companies}.{read,write}`. Until the Marketplace listing is approved the dashboard gates the integration behind a request-access door; the install cap makes open enrolment impossible anyway.

### 3. Connection model

The connection is the existing environment-scoped `Integration` row (`provider = 'hubspot'`, unique per environment), so breaker state, entitlement, the outbound ledger and the message log are inherited. It gains:

```prisma
oauthCredentials Json?     // AES-256-GCM: { accessToken, refreshToken, expiresAt }
remoteAccountId  String?   // HubSpot account (hub) id — journal events and lookups key on it
remoteState      Json      // system-owned: created remote properties/groups, subscription ids, event type names
```

`remoteState` is deliberately separate from the user-editable `config`. Tokens are refreshed on demand before a delivery when within a safety margin of expiry, under a per-integration single-flight lock so concurrent workers do not race the refresh; a refresh failure counts as a delivery failure and feeds the breaker, so a revoked install auto-disables and notifies like any other dead destination.

### 4. Generic CRM layer: mappings and links

Two new tables carry no HubSpot assumptions; a second CRM provider reuses them unchanged.

```prisma
model IntegrationObjectMapping {
  integrationId     String
  remoteObject      String   // 'contact' | 'company' (provider vocabulary)
  localObject       String   // 'user' | 'company'
  matchStrategy     String   // 'email' | 'remoteField'
  matchRemoteField  String?  // remote property holding the Usertour external id
  inboundFields     Json     // [{ remote, local }]
  outboundFields    Json     // [{ local, remote }]
  fullSyncSessionId / fullSyncStartedAt / lastFullSyncAt
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
```

Interface constraints recorded now so the abstraction does not fossilize around HubSpot (a second provider has a Lead/Contact split, cannot always auto-create fields, and has no native timeline): one local object may carry several mappings; the match field is configured per mapping, never hard-wired to email; outbound fields support two modes — provider auto-creates the remote field, or the user picks an existing remote field; events-out is an optional adapter capability. No code is written for the second provider in this milestone.

### 5. Matching and creation

- Contacts match by **email** (the predefined `email` user attribute) or by a **customer-designated contact property** holding the id passed to `usertour.identify()`. Companies match only by a company property holding the `usertour.group()` id.
- **Link, never create.** A link is established only when both records exist. Sync in any direction never creates a user, a company, a contact or a company record; unmatched records are counted (`unresolvedCount`) and re-evaluated on the next round. Rationale: a CRM is mostly leads and never-activated sign-ups; materializing them would flood the user list with session-less shells (the opposite trade-off from ADR 0012, whose cohort members are product users by definition).
- **First-identify backfill:** when `identify` creates a user (or `group` a company) in an environment with a mapping, one targeted lookup by the match field links it and pulls inbound fields immediately, closing the gap until the next full round.

### 6. Field ownership

`Attribute` gains `source` and `sourceId` (the remote property name), the same marker model `Segment` uses for cohort sync.

- **Inbound fields are provider-owned.** The attribute definition is created (or adopted) with the provider marker and rendered with the provider badge in user/company detail, attribute settings and the condition builder. SDK and API writes to a provider-owned attribute are rejected and logged. Adopting an existing attribute of the same code name requires an explicit confirmation and an identical data type; a type mismatch refuses the mapping.
- **Outbound fields are Usertour-owned.** They are written to a provider property group named "Usertour" as `usertour_user_<codeName>` / `usertour_company_<codeName>`, created on demand (idempotent; recorded in `remoteState`). Customer-owned properties are never targets.
- A field cannot appear in both lists of one mapping.
- **The owning side is authoritative:** an empty value at the owner clears the other side (writes `null`); nothing is "skipped to protect" the non-owner.
- Type map: string/enumeration → String, number → Number, bool → Boolean, date/datetime → DateTime, multi-checkbox → List. Read-only and calculated remote properties are not selectable outbound.

### 7. Sync flows

| Flow | Trigger | Path |
|---|---|---|
| Full sync, both directions | mapping saved or its field lists changed; hourly scheduler enqueues mappings whose `lastFullSyncAt` is older than 24 h; "Sync now" | page remote objects (100/page, only match + inbound fields); resolve identity and establish links; apply inbound fields via the canonical attribute path with `origin = provider`; batch write outbound fields for linked records; one queue job per page, rate-limited per account, 429 honoured via `Retry-After`; one round per mapping at a time (`fullSyncSessionId`), a manual trigger during a round returns "in progress" |
| Inbound incremental | v4 journal subscriptions per installed account, `properties` filtered to the mapping's inbound fields plus the match field | a single poller drains the app journal at a fixed interval; events are grouped per record and coalesced; the record's inbound fields are batch-read and applied through the full-sync path; records without a link try to match, else are dropped |
| Outbound incremental | user/company attribute change events | conditions: changed keys ∩ outbound fields ≠ ∅, a link exists, `origin ≠ provider`; a ledger message (`crm.object.update`) carries mapping, local id and changed keys; the processor ensures the remote property, then PATCHes by the link's remote id |
| Events | `BIZ_EVENT_TRACKED` | event in the integration's selected set and the user is linked; ledger message (`crm.timeline.event`); adapter posts the occurrence with `timestamp = event time` and `id = ledger message id`; with a company mapping the event is also written to the linked company |

The journal is pull-based, so no public inbound URL is required — self-hosted instances on private networks sync incrementally too. The project's push `webhooks` component is therefore not used. Journal retention is 3 days; the daily full round is the correctness backstop, and a poller outage longer than the retention window simply falls back to it. Remote deletions do not touch Usertour records; cleared remote values write `null`.

### 8. Events out

Timeline events are **app events**. Event types are declared in the project (one per milestone plus one generic type for customer-defined events) and become available in every installing account. Access requires HubSpot's approval; the request is submitted with this milestone and events-out is the last M1 deliverable. If approval has not landed by then, **custom events** (`events/v3`, Professional+ accounts) ship as the interim path under the same selection UI; both adapters are cheap, the pipeline is identical.

Default selection is the milestone set — flow started / completed / ended, checklist completed, question answered, launcher activated, customer-defined events. `page_viewed` and step-level events are excluded and there is no "stream everything" switch: a CRM record is not an analytics sink. This is a declared exception to ADR 0011 §3 ("an enabled integration receives every tracked event"), scoped to CRM-class providers.

### 9. Loop prevention

Three gates, each sufficient alone: inbound discards changes to properties outside the inbound list (our own `usertour_*` write-backs never re-enter); outbound requires `origin ≠ provider` on the attribute change; a field cannot be in both lists.

### 10. Plan gate

New plan feature `crmIntegrations`: Cloud **Growth and above** (analytics providers stay on `integrations`, Starter+). Self-hosted mode forces it on together with `integrations`, `webhooks` and `customCss` — a self-hosted operator already has to register and upload their own app, and that effort should not be double-charged. Gate points: starting OAuth, saving a mapping, "Sync now", the scheduler, the journal poller, and the outbound/event listeners. A lapsed plan keeps configuration and read/disconnect access; syncing and deliveries stop. The Marketplace listing states the plan requirement.

### 11. Dashboard

Settings → Integrations → HubSpot: connection card (connect via popup, account name/id, disconnect); one card per mapping (match strategy, inbound multi-select, outbound multi-select, both sourced from the remote property metadata); events card (switch + selection); sync status (last full sync, matched, unresolved, Sync now); the shared message log. Provider badges wherever an attribute name is shown.

### 12. Scale and limits

HubSpot allows 100–190 requests per 10 s per account. A 100k-contact account full-syncs in roughly 2,000 calls, spread by the per-account limiter into minutes. Email matching queries users by a JSON attribute; the implementation adds an index for that lookup.

## Alternatives Considered

- **Private-app token as the credential** (fits the analytics-provider "paste a key" model exactly): rejected — HubSpot is removing private-app creation weeks after this decision; service keys cannot authenticate webhooks; no timeline events; a worse setup than every competitor; and the Marketplace requires OAuth anyway.
- **Custom events as the primary events path**: rejected as primary — gated on the customer's HubSpot tier, so free and Starter accounts would receive nothing; kept as the interim path while app-event approval is pending.
- **Push webhooks component for incremental inbound**: rejected — subscriptions are static and per named property, incompatible with customer-selected fields, and require a public target URL. The journal API needs neither.
- **Lists → segments as the first inbound capability** (cheap via ADR 0012): rejected for M1 — property sync is what every surveyed product ships; list sync is a differentiator, not the table stake.
- **Creating users from contacts when the match field carries the external id** (the ADR 0012 rule): rejected — CRM leads are not product users; shells would pollute the user list.
- **A relay through Usertour Cloud for self-hosted OAuth and webhooks**: rejected — routes CRM data through us and makes self-hosting depend on our cloud.
- **Gating the second CRM provider one tier higher**: rejected — one gate for the CRM class.

## Triggers to Revisit

- Journal API leaves beta or changes shape; retention or limits move.
- App-events approval outcome (switch or add the adapter).
- Marketplace approval (remove the request-access door; lift install limits).
- The second CRM provider lands (the mapping/link abstraction gets its second implementation; any HubSpot-ism found then is fixed then).

## Deferred

Deals and custom objects; associated-object fields; lists → segments; custom events as an enhancement; contact merge handling beyond link re-resolution; per-provider plan tiers.
