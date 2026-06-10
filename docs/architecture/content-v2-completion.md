# Content & version v2 — completion design

Successor to `docs/architecture/content-representation.md` (the v0 representation,
now shipped: flow steps + blocks + rules + start/hide rules, read & write, REST +
MCP). This doc designs **what is still missing** to make the v2 `content` and
`content-versions` resources able to do, end-to-end, what the builder does.

Naming/codec rules are unchanged — see
`docs/conventions/content-representation-codec.md`.

## 1. Scope

In scope (the real gaps, prioritized):

1. **Publishing & lifecycle** — publish / unpublish a version to an environment.
2. **`themeId` writable** on a version.
3. **Non-flow content types** — `checklist`, `launcher`, `banner` (their authorable
   config lives in `version.data`, which the v0 step-only codec never touches).
4. **Create draft version** — fork a new editable version.

Explicitly **out of scope** (decided):

- **Localization / translation** — not a current product feature. The
  `VersionOnLocalization` model exists but there is no product surface; do not
  build API for it until the feature itself exists.
- **`hideRulesSetting`** — carries no runtime meaning today; skip until it does.
- **`config.name`** (version-config name) — no meaning; not settable.
- **Granular step ops** (`.../steps/:cvid`) — the whole-version `PATCH` already
  covers create/update/delete-by-cvid; revisit only on a concrete need.
- **`tracker` / `resource-center`** content types — confirm product priority
  before designing (resource-center is a meta-container over other types). Listed
  here so they aren't silently forgotten.

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

**Scheduling** (`version.scheduledAt`) is a follow-up: it needs a worker that flips
scheduled → published at the due time. Confirm that mechanism exists before exposing
a `scheduledAt` on the PUT body. Until then, publish is immediate. (Open question Q1.)

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
  `decompileVersionData(version.data, type, resolvers)`, exposes under `expand=data`.
  (`get_content` / version GET inherit it for free via the shared service; MCP too.)
- **Write**: `updateVersionBody` gains an optional `data` field (one of the three
  shapes, validated against `content.type`). The compile path field-level merges the
  compiled object onto the existing `version.data` (preserving styling/screenshots/
  computed sizes), then passes `data` to the domain `updateContentVersion` (which
  already accepts it).
- A version is exactly one content type → `data` is the single discriminated shape
  for that type; `steps` stays the flow shape. A request must not mix the wrong
  `data` shape with the content's type (validation error).

## 6. Create draft version

```
POST /v2/projects/:projectId/content-versions
  body: { contentId }
  capability: content:create        (or content:update — see Q2)
  → forks editedVersion (regenerated config ids), repoints editedVersionId,
    returns the new version
```

Binds `createContentVersion`. **Open question Q2**: confirm the builder's actual
use of forking (is a new editable version created on demand, or only snapshotted at
publish?) before fixing the verb's exact semantics and capability.

## 7. Capability boundary

- New: gate publish/unpublish on **`content:publish`** (enum already has it; add it
  to the personal-key scope catalog + i18n labels, like the write scopes were
  added).
- `data` and `themeId` writes ride on **`content:update`** (no new scope).
- Create version on `content:create` (pending Q2).
- MCP: optionally add `publish_content` / `unpublish_content` write tools (scope-gated,
  same pattern as `update_content_version`); `data` flows through the existing
  `update_content_version` tool once `updateVersionBody` carries it.

## 8. Suggested phasing

Ordered by value-unblocked vs. effort (domain is ready for all of them):

1. **Publish / unpublish** — unblocks the whole author→ship loop; pure wiring.
2. **`themeId` writable** — one field; high-frequency builder action.
3. **Create draft version** — small; pending Q2.
4. **Non-flow types** — the big one; ship per type: `checklist` → `launcher` →
   `banner`. Each reuses the leaf codecs, so the incremental cost is the wrapper +
   merge + tests.

## 9. Open questions to lock before building

- **Q1 — scheduling**: is there a worker that publishes `scheduledAt` versions? If
  not, publish stays immediate and `scheduledAt` is deferred.
- **Q2 — version forking**: exact semantics + capability for `POST content-versions`
  (on-demand new draft vs. publish-time snapshot).
- **Q3 — tracker / resource-center**: in product scope for v2 or not?
- **Q4 — non-flow `data` exposure**: always include `data` for non-flow types, or
  strictly behind `expand=data`? (Leaning `expand=data` for payload symmetry with
  `steps`.)
