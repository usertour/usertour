# Content & version v2 — completion design

Successor to `docs/architecture/content-representation.md` (the v0 representation,
now shipped: flow steps + blocks + rules + start/hide rules, read & write, REST +
MCP). This doc designs **what is still missing** to make the v2 `content` and
`content-versions` resources able to do, end-to-end, what the builder does.

Naming/codec rules are unchanged — see
`docs/conventions/content-representation-codec.md`.

> **Status: IMPLEMENTED.** All four scope items shipped — publish/unpublish,
> `themeId` writable + `GET themes`, create draft version, and all five non-flow
> content-type body codecs (tracker, checklist, launcher, banner, resource-center).
> Covered by REST + MCP e2e. The sections below are the design of record; the API
> surface table in §10 matches what's live. Out-of-scope items (localization,
> `hideRulesSetting`, `config.name`, scheduled publish, granular step ops) remain
> deferred.

## 1. Scope

In scope (the real gaps, prioritized):

1. **Publishing & lifecycle** — publish / unpublish a version to an environment
   (immediate publish only; scheduling is deferred, see §3).
2. **`themeId` writable** on a version, plus a read-only theme list to make the id
   discoverable (§4).
3. **Non-flow content types** — `checklist`, `launcher`, `banner`, `tracker`,
   `resource-center` (their authorable config lives in `version.data`, which the v0
   step-only codec never touches). `resource-center` is the heaviest (its own block
   taxonomy); `tracker` the lightest.
4. **Create draft version** — fork a new editable version.

Explicitly **out of scope** (decided):

- **Localization / translation** — not a current product feature. The
  `VersionOnLocalization` model exists but there is no product surface; do not
  build API for it until the feature itself exists.
- **`hideRulesSetting`** — carries no runtime meaning today; skip until it does.
- **`config.name`** (version-config name) — no meaning; not settable.
- **Scheduled publishing** (`version.scheduledAt`) — deferred; needs a worker that
  flips scheduled → published at the due time (§3).
- **Granular step ops** (`.../steps/:cvid`) — the whole-version `PATCH` already
  covers create/update/delete-by-cvid; revisit only on a concrete need.

## 2. The enabler — the domain layer is already ready

Almost none of this needs domain changes. Verified in `src/content/content.service.ts`:

- `VersionInput` (the `updateContentVersion` payload) **already accepts**
  `themeId`, `data`, `config`, `scheduledAt`, and `steps`. The v2 write path simply
  doesn't *expose* `themeId` / `data` yet.
- `publishedContentVersion(versionId, environmentId)` and
  `unpublishedContentVersion(contentId, environmentId)` exist and write
  `ContentOnEnvironment` (the source of truth for publish state, per
  `v2-publish-facts-source`).
- `createContentVersion({ versionId, config })` forks the edited version into a new
  one (regenerating config IDs) and repoints `editedVersionId`.

So this is overwhelmingly a **v2-layer** effort: representation codecs, request
DTOs, controller verbs, capability gating, and e2e — not domain work.

## 3. Publishing & lifecycle

Publish state is per `(content, environment)` → `publishedVersionId`. The v2 read
model already exposes it as `content.environments[]`. Model the write as PUT/DELETE
of one environment entry — publish is idempotent "set the live version", unpublish
is "clear it".

```
PUT    /v2/projects/:projectId/content/:id/environments/:environmentId
         body: { versionId }            → publish that version to that env
         capability: content:publish
DELETE /v2/projects/:projectId/content/:id/environments/:environmentId
                                        → unpublish from that env
         capability: content:publish
```

- Idempotent: PUT with the already-live version is a no-op 200.
- Validate `versionId` belongs to `:id` and the env belongs to the project.
- Response: the updated `content` (with refreshed `environments[]`), so a client
  sees the new live state in one round-trip.
- Binds the existing domain methods directly; no new persistence logic.

**Scheduling** (`version.scheduledAt`) is **deferred** (decided): publish is
immediate, no `scheduledAt` on the PUT body. It needs a worker that flips
scheduled → published at the due time; revisit when that worker exists.

## 4. `themeId` writable

Add `themeId` to the version write body; the domain already persists it.

```
PATCH /v2/projects/:projectId/content-versions/:id
  body += { themeId?: string | null }   // null clears → falls back to project default
```

- Validate the theme exists in the project (a compile-time resolver check,
  analogous to how segment/attribute references are resolved).
- Read already returns `themeId`; this closes the round-trip.
- Merge semantics match the existing rules merge: omitted = untouched, `null` = clear.

**Decided: add a read-only `GET /v2/projects/:projectId/themes`** alongside this.
Once `themeId` is writable, a client needs to discover valid theme ids; a thin
list/get theme resource (id + name, the usual `schema.ts` + `mapper.ts` projection)
closes that gap. Gate on a `theme:read` scope (enum already has it). It is a small,
self-contained resource — build it with the `themeId`-writable change.

## 5. Non-flow content types — `version.data` codec

This is the large piece. `flow` content lives in `step.data` (covered by v0). The
other types keep their authorable config in **`version.data`**, which the step-only
codec never reads or writes. The win: every nested part of that config is a type
the **leaf codecs already handle** —

| nested piece | internal type | existing codec to reuse |
|---|---|---|
| `content` / `contents` / `tooltip.content` | `ContentEditorRoot[]` | block codec (`decompileContent`/`compileContent`) |
| item conditions, `behavior.actions` | `RulesCondition[]` | rules codec |
| `target.element`, `containerElement` | `ElementSelectorPropsData` | target codec |
| placement / alignment | `ContentAlignmentData` | `representationPlacement` |

So the new code is a thin per-type wrapper that maps scalar fields and **delegates
the nested parts to the existing codecs** — same lossy-but-merge-preserving
philosophy as steps (drop styling / screenshots / computed sizes / runtime state;
preserve them on write by field-level merge against the existing `version.data`).

### 5.1 Codec layout

New area following the convention: `version-data.decompile.ts` / `version-data.compile.ts`
(dispatch by `content.type`), with the three shapes added to `representation.schema.ts`
(`representationChecklist`, `representationLauncher`, `representationBanner`).

The decompiler needs `content.type` (the version row alone doesn't carry it) — load
it alongside the version in `content-versions.service`. Expose the result on the
version as `data`, behind `expand=data` (heavy, like `steps`).

### 5.2 Proposed shapes (representation, intent-level)

```ts
// checklist  (from ChecklistData)
representationChecklist = {
  buttonText: string,
  initialDisplay: 'expanded' | 'button',
  completionOrder: 'any' | 'ordered',
  preventDismiss: boolean,
  autoDismiss: boolean,
  content: Block[],                      // ChecklistData.content
  items: {
    name: string,
    description?: string,
    completeWhen: Condition[],           // completeConditions
    clickActions: Action[],              // clickedActions
    onlyShowWhen?: Condition[],          // onlyShowTaskConditions (if onlyShowTask)
  }[],
}
// drop on read / preserve on write: item id (merge key), isCompleted/isClicked/
// isVisible/isShowAnimation (runtime state)

// launcher  (from LauncherData)
representationLauncher = {
  style: 'beacon' | 'icon' | 'hidden' | 'button',   // LauncherDataType
  icon: { source: 'none'|'builtin'|'upload'|'url'|'inherit', url?: string, type?: string },
  buttonText?: string,
  target: Target,                        // target.element
  tooltip: {
    placement: Placement,                // tooltip.alignment
    width: number,
    content: Block[],                    // tooltip.content
    settings: {
      dismissAfterFirstActivation: boolean,
      keepOpenWhenHovered: boolean,
      hideLauncherWhenTooltipShown: boolean,
    },
  },
  behavior: {
    triggerElement: 'launcher' | 'target' | 'target-or-launcher',
    event: 'clicked' | 'hovered',
    action: 'show-tooltip' | 'perform-action',
    actions?: Action[],                  // behavior.actions
  },
}
// drop / preserve: screenshot, zIndex

// banner  (from BannerData)
representationBanner = {
  placement: BannerEmbedPlacement,
  content: Block[],                      // contents
  settings: {
    overlayOverAppContent: boolean,
    stickToTop: boolean,
    allowDismiss: boolean,
    animateOnAppear: boolean,
  },
  containerTarget?: Target,              // containerElement
  layout?: { maxContentWidth?: number, maxEmbedWidth?: number,
             borderRadius?: number, outerMargin?: object },
}
// drop / preserve: height (computed), zIndex
```

### 5.3 Read / write plumbing

- **Read**: `content-versions` service loads `content.type`, runs
  `decompileVersionData(version.data, type, resolvers)`, exposes under `expand=data`
  — **decided (was Q4)**: behind `expand`, not always-on, for payload symmetry with
  `steps` (both are heavy bodies; keep the default version response slim).
  (`get_content` / version GET inherit it for free via the shared service; MCP too.)
- **Write**: `updateVersionBody` gains an optional `data` field (one of the three
  shapes, validated against `content.type`). The compile path field-level merges the
  compiled object onto the existing `version.data` (preserving styling/screenshots/
  computed sizes), then passes `data` to the domain `updateContentVersion` (which
  already accepts it).
- A version is exactly one content type → `data` is the single discriminated shape
  for that type; `steps` stays the flow shape. A request must not mix the wrong
  `data` shape with the content's type (validation error).

### 5.4 `resource-center` and `tracker`

Both are in scope. They differ enough from the first three to call out:

**`resource-center`** — the heaviest. It is not a single body but its **own block
taxonomy** (`ResourceCenterBlockType`): `richtext`, `action`, `divider`, `sub-page`,
`content-list`, `live-chat`. Each block shares `onlyShowBlock` + `onlyShowBlockConditions`
(→ rules codec) and most carry an icon (`LauncherIconSource`). Reuse is still strong,
but three blocks need new handling:

- `richtext` / `sub-page` → `content: ContentEditorRoot[]` via the block codec; `sub-page` nests.
- `action` → `clickedActions: RulesCondition[]` via the rules codec.
- `content-list` → **references other content by id** → needs an id↔code resolver,
  same pattern as segment/attribute references.
- `live-chat` → a provider enum (`LiveChatProvider`) + provider config; model the
  provider + opaque settings, do not hard-code per-provider fields.

Decided: **support all six block types** in v0 (including `content-list` and
`live-chat`). Give it its own codec area (`resource-center.{schema,decompile,compile}.ts`)
rather than overloading `version-data.*`; it is large enough to stand alone, and like
`rules.*` it can move to `shared/` if anything else ever reuses the block taxonomy.
This is the single largest piece of the completion work.

**`tracker`** — the lightest, now fully specified from the builder
(`content-detail-tracker-editor.tsx`). A tracker is a "when X happens → track event Y"
rule with two stored parts:

- the **trigger** ("when this happens") lives in `config.autoStartRules` — the *same*
  field the existing `startRules` codec already handles (tracker uses only `when`; no
  frequency / priority / wait). So a tracker's trigger is authored through the existing
  `startRules.when`, **no new code**.
- the **tracked event** ("then track this event") lives in `version.data.eventId` — a
  single event reference.

So the only new `data` shape is one field:

```ts
representationTracker = { event: string }   // version.data.eventId, via the event id↔code resolver
```

reusing the event resolver that event conditions already use. (No `TrackerData` type
exists in the model; `version.data` simply holds `{ eventId }`.)

## 6. Create draft version

```
POST /v2/projects/:projectId/content-versions
  body: { contentId }
  capability: content:update
  → forks editedVersion (regenerated config ids), repoints editedVersionId,
    returns the new version
```

Binds `createContentVersion`. Semantics confirmed from the codebase (no longer
open): the web builder already forks versions on demand (e.g. saving content
settings calls `createContentVersion({ versionId })`), and the existing
endpoint-capability map gates it on **`content:update`** — so v2 matches that
capability and that fork-to-new-editable-head semantics: the current edited version
is copied (sequence + 1, config ids regenerated), the copy becomes the new
`editedVersion`, and the previous draft is frozen as a historical version.

## 7. Capability boundary

- New: gate publish/unpublish on **`content:publish`** (enum already has it; add it
  to the personal-key scope catalog + i18n labels, like the write scopes were
  added).
- `data` and `themeId` writes ride on **`content:update`** (no new scope).
- Create version on **`content:update`** (matches the existing endpoint-capability map).
- `GET themes` on **`theme:read`** (enum already has it; add to the scope catalog).
- MCP: optionally add `publish_content` / `unpublish_content` write tools (scope-gated,
  same pattern as `update_content_version`); `data` flows through the existing
  `update_content_version` tool once `updateVersionBody` carries it.

## 8. Suggested phasing

Ordered by value-unblocked vs. effort (domain is ready for all of them):

1. **Publish / unpublish** — unblocks the whole author→ship loop; pure wiring.
2. **`themeId` writable + `GET themes`** — one field + a thin read resource; the
   theme list makes the writable id discoverable.
3. **Create draft version** — small; binds `createContentVersion` (§6).
4. **Non-flow types** — the big one; ship per type, cheapest first:
   `tracker` (one field + existing `startRules`) → `checklist` → `launcher` →
   `banner` → `resource-center`. The middle three reuse the leaf codecs (wrapper +
   merge + tests each); **`resource-center` is the largest single effort** — its own
   six-block-type codec — and should be scheduled as a project of its own.

## 9. Open items still to resolve

The earlier Q1–Q4 and the three follow-ups are all decided:

- scheduling deferred (publish immediate)
- forking = `content:update`, fork-to-new-editable-head
- non-flow `data` behind `expand=data`
- **tracker** fully specified — trigger reuses `startRules`, `data` is `{ eventId }` (§5.4)
- **resource-center** — all six block types in v0 (§5.4)
- **theme listing** — add read-only `GET themes` with the `themeId` change (§4)

Nothing blocking remains; the design is ready to implement in the §8 order.

## 10. API surface summary

All paths this doc adds, consolidated. `:p` = `:projectId`.

### New paths

| Method | Path | Purpose | Scope | § |
|---|---|---|---|---|
| `PUT` | `/v2/projects/:p/content/:id/environments/:environmentId` | Publish — set this env's live version (body `{ versionId }`, idempotent) | `content:publish` | 3 |
| `DELETE` | `/v2/projects/:p/content/:id/environments/:environmentId` | Unpublish — clear this env's live version | `content:publish` | 3 |
| `POST` | `/v2/projects/:p/content-versions` | Create draft version (fork, body `{ contentId }`) | `content:update` | 6 |
| `POST` | `/v2/projects/:p/content-versions/:id/restore` | Restore a historical version → forks it forward as the new draft | `content:update` | — |
| `POST` | `/v2/projects/:p/content/:id/duplicate` | Duplicate content (body `{ name?, environmentId? }`) → new content | `content:create` | — |
| `GET` | `/v2/projects/:p/themes` | List themes (read-only — makes `themeId` discoverable) | `theme:read` | 4 |
| `GET` | `/v2/projects/:p/themes/:id` | Get one theme | `theme:read` | 4 |

> `restore` and `duplicate` (and the soft-deleted-content list fix) are post-design
> follow-ups (the §B increments) — they expose existing builder/admin business
> interfaces (`restoreContentVersion` / `duplicateContent`) verbatim. MCP:
> `restore_content_version`, `duplicate_content`.

### Extensions to existing paths (no new route)

| Method | Path | Extension | Scope | § |
|---|---|---|---|---|
| `PATCH` | `/v2/projects/:p/content-versions/:id` | body `+= themeId` (omit = untouched, `null` = clear) | `content:update` | 4 |
| `PATCH` | `/v2/projects/:p/content-versions/:id` | body `+= data` (checklist / launcher / banner / tracker / resource-center body) | `content:update` | 5 |
| `GET` | `/v2/projects/:p/content-versions/:id?expand=data` | read `data` (non-flow body; heavy → behind `expand`, symmetric with `steps`) | `content:read` | 5 |

### Notes

- Non-flow content types add **no new paths** — they ride the version `PATCH`
  (write `data`) and `GET ?expand=data` (read `data`); one version is exactly one
  content type, so `data` is that type's discriminated shape.
- New scopes vs. the current catalog: only **`content:publish`** and **`theme:read`**
  (both already in the `Capability` enum; add to the personal-key scope catalog).
  Everything else reuses `content:read` / `content:update`.
- MCP (optional): `publish_content` / `unpublish_content` tools mirror the publish
  paths; `data` flows through the existing `update_content_version` tool.
