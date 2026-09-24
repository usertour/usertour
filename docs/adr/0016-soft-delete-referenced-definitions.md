# 0016: Soft delete for referenced definitions — themes, attributes, segments, events

- **Date:** 2026-09-24
- **Status:** Accepted

## Context

Themes, attribute definitions, segments and event definitions share one trait: content refers to them **by internal id**. A version carries `themeId` (and steps a per-step `themeId`); stored conditions carry `attrId`, `segmentId` and `eventId`; segment conditions reference attributes; theme variations reference attributes and segments.

All four are hard-deleted today, each with its own ad-hoc rules:

| Definition | Delete today | Guard today |
|---|---|---|
| Theme | `theme.delete`; FK `Version.themeId` / `Step.themeId` is `ON DELETE SET NULL` | Refuses while a live published version or a current draft uses it (its own query in `ThemesService.deleteTheme`); system and default themes refuse |
| Attribute | `attribute.delete` after clearing `AttributeOnEvent` links | Predefined and provider-owned attributes refuse; **no in-use check** |
| Segment | `segment.delete` after clearing `BizUserOnSegment` / `BizCompanyOnSegment`; `IntegrationSyncedSegment` cascades | **None** |
| Event | `event.delete` after clearing `AttributeOnEvent` links | Predefined events refuse; refuses once any `BizEvent` was recorded (FK `RESTRICT`), so in practice only never-fired events can be deleted |

That produces three failures:

1. **History is destroyed.** Deleting a theme nulls `themeId` on every historical version that used it. Restoring such a version yields a draft with no theme, and the runtime has no fallback theme.
2. **Live references break silently.** Deleting an attribute or a segment that a published version's conditions use makes those conditions fail closed — a missing segment evaluates `false` (`ConditionEvaluationService`), a missing attribute decompiles as an `unsupported` condition that never matches. Auto-start rules stop firing with no signal to anyone.
3. **Recreating does not repair.** Creating an attribute or event with the same `codeName` mints a new id; every condition that referenced the old id stays dead. The decompiler's own advice is "recreate the attribute and repair the condition in the builder".

Two facts shape the fix:

- **Soft delete is already the convention for identity-bearing resources.** Content and Localization soft-delete through a `deleted` column and restore through v2 (`POST …/restore`, `GET …?deleted=true`) and MCP (`restore_content`, `restore_localization`), with no web trash. Localization additionally restores on create: its `code` stays reserved while deleted, and creating it again brings the old row back with everything it held. The attribute resolver catalog (`loadResolverCatalogs`) was already written on the assumption that attributes soft-delete.
- **The reverse-reference scan already exists.** `ApiReferencesService.listReferences` answers "who still uses this attribute / event / segment / theme?" by walking each non-deleted content's draft and published versions, segment conditions and theme variations, matching exact id keys (plus the codeName binding of question attributes). It backs MCP `find_references`, and today only informs; nothing enforces it.

All four tables already carry an unused `deleted Boolean @default(false)` column. A production check (2026-09-24) found zero rows with `deleted = true` in any of them.

## Decision

### 1. Invariant

> A **live surface** never references a deleted definition. **History** may, and resolves it by id.

Live surfaces are: the draft and published versions of non-deleted content, the conditions of non-deleted segments, and the variations of non-deleted themes. History is every other version. The invariant is enforced at three points: deletion (§3), publish (§4), and restoring a segment or theme (§5). Everything else in this ADR follows from it.

### 2. Delete marks, the row stays

Deleting a theme, attribute, segment or event sets its existing `deleted` column to `true`. No schema change and no migration: the column is reused as-is, consistent with Content and Localization.

- **Listing, picking and new references** exclude deleted rows: the web lists and pickers, v2 and MCP lists, the resolver used to compile a codeName into an id on write.
- **Resolving by id** includes deleted rows: delivery, decompiling a stored condition back to a codeName, rendering a historical version, restoring a version.
- Side data the definition owns is kept, not cleaned up: `AttributeOnEvent` links stay, and **segment memberships (`BizUserOnSegment` / `BizCompanyOnSegment`) stay**, so a restored manual segment comes back with its members. Every read of memberships that is not keyed by one segment id filters by `segment.deleted = false` (for example a user's segment list); reading the members of a deleted segment by its id is a 404.
- Deleting a segment that an integration syncs removes its `IntegrationSyncedSegment` explicitly, matching today's cascade. Otherwise the sync would keep writing members into a deleted segment. A restored segment returns without a sync link.
- The existing refusals stay: system and default themes, predefined attributes and events, provider-owned attributes.

### 3. Refuse deletion while in use

A delete is refused when any live surface references the definition. The error lists the referrers (the first few names), the same shape as today's `ThemeInUseError`, so the caller can rewire them and retry. History never blocks — versions are permanent, so counting them would make every once-used definition undeletable.

There is **one** implementation for all four: the reverse-reference scan moves from `src/api/references` into the domain layer (`src/modules`, per ADR 0015) and every delete path calls it. It replaces Theme's bespoke in-use query. GraphQL, v2 and MCP all delete through the same domain service, so no entry point can skip the guard. MCP `find_references` keeps using the same scan to explain a refusal in advance.

Event's "refuse once any `BizEvent` was recorded" is dropped: `BizEvent` rows keep their `eventId` and resolve it by id, so recorded history no longer pins the definition. A fired event becomes deletable (hideable), which is new capability, not only a fix.

`{{ codeName }}` mentions in text stay out of scope, as they are in the scan today: they are display bindings that render empty, not references.

### 4. Publish refuses deleted references

Restoring a historical version can bring a deleted definition's id back into a draft. Drafts stay lenient, the existing standard (incomplete content is tolerated); **publish** refuses a version whose conditions, theme or step themes reference a deleted definition, naming it. The author either restores the definition or picks another. This closes the only path by which a live surface could come to reference a deleted definition after §3.

The check lives in `ContentService.publishedContentVersion`, which the web app (GraphQL), v2 and MCP all publish through.

### 4a. Every entry point, including the web app

§3 and §4 are domain rules, not API rules. The web app deletes and publishes through the same domain services as v2 and MCP, so it is bound by both: deleting an attribute, segment or event that live content uses is refused in the web app too (themes already were), and so is publishing a version that references a deleted definition. The web app must surface these refusals legibly — the referrer names or the deleted definition's name, through i18n — rather than a generic failure.

### 5. Restore

**Explicit restore, for all four**, following the Content / Localization precedent:

- v2: `POST /v2/projects/:projectId/{themes|attribute-definitions|segments|event-definitions}/:id/restore`, and `deleted=true` on each list endpoint to find what can be restored.
- MCP: `restore_theme`, `restore_attribute_definition`, `restore_segment`, `restore_event_definition`; each `list_*` tool accepts `deleted: true`.
- Capability: the resource's `*Update` capability, as for `content:update` and `localization:update`.
- Restoring a definition that is not deleted is a no-op that returns it, so retries are safe.
- No web trash, the same as Content and Localization. The API is where scripted and agent-driven deletes happen, and that is where undo is needed.

**Restore on create, for attributes and events**, which have a natural key (`(projectId, bizType, codeName)` / `(codeName, projectId)`):

- An explicit create (web, GraphQL, v2, MCP) whose key matches a deleted row restores that row with the incoming display fields instead of failing on the unique constraint — every condition that referenced the old id resolves again. If the requested `dataType` differs from the deleted attribute's, the create is refused with an error that says the codeName is held by a deleted attribute of another type: conditions written against the old type would silently mis-evaluate under a new one.
- **Implicit creates restore too.** SDK `identify` (`BizService` attribute resolution), SDK `track` (`EventTrackingService.registerCustomEvent`) and CRM mapping adoption (`ObjectMappingService`) all find-or-create by key. On a deleted match they restore it; they do not write into it while it is still marked deleted. Data still arriving under that codeName means the definition is not dead. An SDK restore keeps the stored `dataType`, and values that do not validate against it are dropped exactly as they are for any existing attribute.

Themes and segments have no natural key (names are not unique), so they restore only explicitly.

**Restoring a segment or theme refuses while its conditions use deleted definitions** (E1046, naming them with their ids). Unlike restored content, which comes back as an unpublished draft behind the publish check, a restored segment or theme is live at once — so a segment deleted before the attribute it filters on, then restored, would otherwise come back referencing a deleted definition. The caller restores those definitions first, then retries. Restore only exists on the API and MCP, so this is one more call, not a dead end.

### 6. Caches

Delete and restore invalidate what delete invalidates today: the project's attribute and theme catalogs, and the delivery-side segment memo.

## Consequences

**Good**

- Historical versions keep their theme and their resolvable conditions; restoring an old version reproduces it.
- A published experience can no longer be broken silently by deleting something it depends on.
- A mistaken delete is recoverable through the API and MCP; recreating an attribute or event by the same codeName repairs its references instead of forking them.
- One guard and one scan for four resource kinds, instead of four sets of rules.
- Fired events become deletable, which users could not do before.
- No migration. Most read paths already carry `deleted: false` filters that have been inert until now; they start meaning something.

**Bad**

- Every read that lists definitions must filter `deleted`, and a missed filter shows a deleted definition. The existing inert filters cover much of it, but reads without one must be audited, and segment membership readers are new ground.
- A codeName stays reserved forever once used. An attribute codeName cannot be reused for a different `dataType` — restoring it is the only path — and there is no purge.
- Deleted rows accumulate. At current volumes (about 181k attribute rows, 62k events, 5k themes and 5k segments in production) this is negligible.
- Delete becomes slower: it runs the reference scan, which reads the project's live versions. The scan is prefiltered by `jsonb::text` and runs only on delete.
- Event delete changes its public error semantics: `EventDefinitionInUseError` now means "referenced by live content", not "has recorded events". Attribute and segment deletes gain in-use errors they did not have. v2 docs, the OpenAPI snapshot and MCP tool descriptions change accordingly.

## Alternatives Considered

- **Hard delete plus an in-use guard, no soft delete.** Stops live breakage, but history still loses its theme through `SET NULL`, recreating still forks ids, and fired events stay undeletable. It fixes one of the three failures.
- **Fall back to the default theme when `themeId` is null.** Hides the symptom; the historical look is still gone.
- **Warn but allow deletion of in-use definitions.** That is the silent breakage this ADR exists to remove, with a dialog in front of it.
- **A new `deletedAt` column instead of the existing `deleted` flag.** Carries more information, but while the dormant `deleted` columns are not being cleaned up it would leave two markers per table, and Content and Localization use `deleted`. Revisit together with that cleanup.
- **A Prisma extension that filters deleted rows automatically.** Implicit, and it fights the reads that must include deleted rows (resolve by id, restore, `deleted=true` listings).
- **A maintained reference index table instead of scanning.** Already rejected when the scan was built: write-path cost and drift risk for a read that happens only on delete.
- **Clearing segment memberships on delete.** Restore would bring back an empty manual segment, a hand-curated list lost for good.
- **Cascade restore (bring a segment or theme's deleted dependencies back with it).** Restoring a dependency needs its own capability (`attribute:update`, `segment:update`), which a cascade would bypass, and it silently undoes someone else's deliberate delete with no direct action in the audit trail.
- **Allow restoring a segment or theme with deleted dependencies.** It would still evaluate — delivery resolves deleted definitions by id — but it breaks the invariant, and the web app would show a live segment on an attribute no picker lists.
- **Restore only by recreating, no explicit restore endpoint.** Leaves themes and segments, which have no natural key, unrecoverable, and breaks the Content / Localization precedent.
- **A web trash view.** Not now, as for Content and Localization.

## Triggers to Revisit

- Users ask for undo in the web app → add a trash view on top of the same restore paths.
- A codeName needs to be reused with a different type, or deleted rows grow materially → add a purge (hard delete of a deleted row with no historical references).
- The dormant `deleted` columns on Version, BizUser, BizCompany and BizSession are cleaned up → reconsider `deletedAt` for all soft-deleting tables at once.
- The reference scan makes deletes noticeably slow on large projects → revisit the index-table trade-off.
