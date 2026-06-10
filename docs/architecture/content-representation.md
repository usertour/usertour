# Content representation schema (v2) — design

> Status: **implemented (v0)** — read (decompiler) + write (compiler + field
> merge) + MCP tools shipped on `feat/api-token`; decisions locked (§11). Captures
> the design + decisions for enriching the v2
> content/version surface with the actual step content, as a single
> representation that serves **read and write** and **REST and MCP**.
>
> Reference products below are referred to by category, not name.

## 1. Problem

The v2 `content` / `contentVersion` surface is slim: a version exposes only
`id / number / questions / timestamps`. The **substance of a flow — its steps —
is not exposed at all** (`questions` is just a thin projection extracted from
step content). An API consumer or MCP agent cannot see "what steps a flow has,
what each targets, what it says."

Goal: expose the step content, as a representation that also works for **future
writes** (AI/integration representation), without welding the internal builder model
to a public contract.

## 2. Non-negotiable facts

- **Publish facts** (`published` / `publishedVersionId` / `publishedAt`) are
  accurate **only on `ContentOnEnvironment`**, already exposed via
  `content.environments[]`. The same-named fields on `Content` / `Version` are
  legacy/inaccurate — never expose them. Publish state is **done**, not part of
  this work.
- The internal step body is `ContentEditorRoot[]` — a nested layout tree
  (`row → column → element`) with element-specific data and embedded recursive
  rule conditions. It is **internal, undocumented, unstable**. It must **never**
  be the write contract, and is not exposed raw on read.

## 3. Core principle

A **stable, intent-level representation schema** sits between consumers and the
internal model:

```
                compile  ┌─────────────────────────┐  decompile
 representation  ───────────► │  ContentEditorRoot[] +   │ ──────────►  representation
 (this doc)              │  Step fields (internal)  │              (this doc)
                         └─────────────────────────┘
```

- **One schema, two directions**: read = decompile, write = compile. Symmetric
  `read → edit → write`, so an agent never touches the internal tree.
- **One schema, two surfaces**: REST and MCP both bind the same
  schema + mappers + service (MCP already binds `src/api` services today).
- Internal tree / raw JSON stays internal. Server owns `id`/`cvid`, theme,
  layout, and styling defaults.

## 4. Reference-product survey (by category)

| dimension | block-doc tool | form builder | changelog/CMS tool | **ours** |
|---|---|---|---|---|
| structure | nested children tree | flat array + group refs | prose | **flat block list** |
| rich text | structured spans | HTML | accepts HTML **or** markdown | **markdown** |
| capability gap | `unsupported` block, read-only | (hidden behind intent) | — | **`unsupported`, read-only** |
| writes | append / update / archive (ops), no whole-tree replace | intent-level (server composes) | create with either format | **ops via read-modify-write** |
| MCP auth | OAuth | OAuth + Bearer | — | **Bearer now → OAuth (Phase 3)** |
| MCP write | emit structured blocks | intent ("remove the phone field") | — | **Phase 4 — see §9** |

Takeaways:
- Flat block list is easier for LLMs to author than a nested tree.
- Rich text is a 3-way choice; **markdown** wins for us because our content is a
  *constrained* set, the consumer is AI-first, and markdown is safe to accept
  (no HTML sanitization / injection surface) and maps cleanly to our finite
  node set. The only things markdown can't carry (text color, alignment) are
  styling we drop in v0.
- Capability gaps → an explicit `unsupported`, read-only marker (no raw
  passthrough in v0).
- Writes → never whole-tree blob replace; ops/patch semantics.

## 5. The representation schema (v0)

Per-step, plus version-level rules (§5.1). All nested objects carry an `object`
discriminator (A-shape).

```ts
RepresentationStep = {
  object: "step";
  id?: string;            // server-owned; present on read, absent on write = new
  cvid?: string;          // upsert key (see §8); server-generated for new steps
  name: string;
  type: "tooltip" | "modal" | "bubble" | "hidden";
  target?: RepresentationTarget;        // tooltip/bubble; n/a for modal
  placement?: RepresentationPlacement;  // simplified from StepSettings
  width?: number;                  // step width px (omit → theme default)
  skippable?: boolean;
  content: RepresentationBlock[];       // the body (decompiled ContentEditorRoot[])
  triggers?: RepresentationTrigger[];   // when conditions met → run actions (§5.1)
  advanced?: { hasUnsupported: boolean };
};

RepresentationTarget =
  | { by: "selector"; selector: string; nth?: number }   // internal customSelector + sequence
  | { by: "text"; text: string };                        // internal content match (dynamic content)
  // The internal "auto" selectors fingerprint (a captured DOM parent/sibling tree)
  // is NOT authorable and NOT modeled. On read, an auto-target with no usable
  // content/selector → omitted (step.advanced.hasUnsupported). On write only
  // selector/text are accepted; an untouched fingerprint is preserved by the
  // field-level merge (§8) — only an explicit new target replaces it.

RepresentationPlacement =
  | { side: "top"|"right"|"bottom"|"left"; align: "start"|"center"|"end"; sideOffset?: number; alignOffset?: number }   // tooltip/bubble
  | { position: "center"|"top"|"bottom"|"left"|"right"; offsetX?: number; offsetY?: number; backdrop?: boolean; blockTarget?: boolean }; // modal

RepresentationBlock =
  | { object:"block"; type:"text";        markdown: string }   // + Liquid subset, see §6
  | { object:"block"; type:"image";       url: string; alt?: string; link?: { url: string; newTab?: boolean } }
  | { object:"block"; type:"button";      text: string; actions?: RepresentationAction[]; disabledWhen?: RepresentationCondition[]; hiddenWhen?: RepresentationCondition[]; variant?: "primary"|"secondary" }
  | { object:"block"; type:"embed";       url: string }
  | { object:"block"; type:"question";    question: RepresentationQuestion }
  | { object:"block"; type:"columns";     columns: { width?: { unit:"percent"|"pixels"|"fill"; value?: number }; blocks: RepresentationBlock[] }[] }  // per-column width is structural
  | { object:"block"; type:"unsupported"; note?: string };              // capability gap, read-only

RepresentationQuestion =                          // 6 internal question elements → 4 kinds
  | { kind:"nps";    name: string; cvid?: string; lowLabel?: string; highLabel?: string; bindAttribute?: string }
  | { kind:"rating"; name: string; cvid?: string; style:"star"|"scale"; range:{low:number;high:number}; default?: number; lowLabel?: string; highLabel?: string; bindAttribute?: string }
  | { kind:"text";   name: string; cvid?: string; multiline: boolean; placeholder?: string; buttonText?: string; required?: boolean; bindAttribute?: string }
  | { kind:"choice"; name: string; cvid?: string; options:{label:string;value:string}[]; allowMultiple: boolean; enableOther?: boolean; otherPlaceholder?: string; shuffle?: boolean; buttonText?: string; bindAttribute?: string };

```

- Every block carries an optional `id?: string` — the round-trip merge key (§8)
  that maps a representation block to its internal element so untouched styling
  (margins/padding/widths/colors/align) survives a write.
- `bindAttribute?` collapses internal `bindToAttribute(bool) + selectedAttribute(code)`.
- Every `question` block may also carry `actions?: RepresentationAction[]` (run on answer).
- `content` is a **flat block list** (vertical stack, the 95% case). Side-by-side
  layout uses an explicit `columns` block (per-column width is structural, kept).
  Anything unrepresentable → `unsupported`.

### 5.1 Rules: conditions, actions, triggers

The behavior layer — *when* something runs and *what* it does. The same
recursive `RulesCondition` tree drives content start/hide rules, step triggers,
and button/question gating; actions are the effects. This is the system's core
value, so it is fully modeled, not deferred to `unsupported`.

```ts
// Predicate tree. internal `operators` and/or → group `match` all/any.
RepresentationCondition =
  | { type:"group";          match:"all"|"any"; conditions: RepresentationCondition[] }
  | { type:"user_attribute"; attribute: string; op: AttrOp; value?: string; value2?: string; values?: string[] }
  | { type:"segment";        segment: string; in: boolean }              // segment by id
  | { type:"current_url";    includes: string[]; excludes?: string[] }   // URL glob/regex patterns (NOT op+value)
  | { type:"element";        target: RepresentationTarget; state:"present"|"hidden"|"disabled"|"enabled"|"clicked"|"unclicked" }
  | { type:"flow";           flow: string; state:"seen"|"unseen"|"completed"|"uncompleted"|"active"|"inactive" }
  | { type:"event";          event: string;
                             count?:{ op:"at_least"|"at_most"|"exactly"|"between"; n:number; n2?:number };
                             within?:{ op:"in_the_last"|"more_than"|"between"|"any_time"; value?:number; value2?:number; unit?:"seconds"|"minutes"|"hours"|"days" };
                             scope?:"current_user"|"current_user_in_company"|"any_user_in_company";
                             where?: RepresentationCondition[] }              // nested filter on the event's attributes
  | { type:"text_input";     target: RepresentationTarget; op: StringOp; value?: string }
  | { type:"text_filled";    target: RepresentationTarget }                  // "field was filled" — no op/value
  | { type:"time_window";    start?: string; end?: string }             // ISO 8601 (legacy MM/dd format → unsupported)
  | { type:"unsupported";    note?: string };                          // auto-target, task-is-clicked (unimplemented), legacy time, unknown types

// user_attribute ops are data-type-dependent (resolved against the attribute);
// the compiler validates op ∈ the set for that attribute's type:
//   string:   is|not|contains|not_contains|starts_with|ends_with|empty|any
//   number:   is|not|lt|lte|gt|gte|between|empty|any
//   boolean:  true|false|empty|any
//   list:     includes_any|includes_all|not_includes_any|not_includes_all|empty|any
//   datetime: less_than|exactly|more_than|before|on|after|empty|any
AttrOp = string;
StringOp = "is"|"not"|"contains"|"not_contains"|"starts_with"|"ends_with"|"match"|"unmatch"|"any"|"empty";

// Effects.
RepresentationAction =
  | { type:"goto_step";       step: string }                  // step key/cvid
  | { type:"start_flow";      flow: string; step?: string }
  | { type:"navigate";        url: string; newTab?: boolean; newWindow?: boolean } // url supports {{ }} (see §6)
  | { type:"dismiss" }                                        // dismiss the current content
  | { type:"run_javascript";  script: string }               // READ-ONLY: never accepted on write
  | { type:"unsupported";     note?: string };

RepresentationTrigger = { when?: RepresentationCondition[]; do: RepresentationAction[]; waitMs?: number };
```

Attachment points:

```ts
// version-level — the start/hide rules (the system's most important behavior)
RepresentationVersion = {
  // …id / number / steps / questions(summary)…
  startRules?: {
    when: RepresentationCondition[];
    frequency?: { mode:"once"|"multiple"|"unlimited";
                  every?:   { times?: number; duration: number; unit:"seconds"|"minutes"|"hours"|"days" };
                  atLeast?: { duration: number; unit:"seconds"|"minutes"|"hours"|"days" } };
    priority?: "highest"|"high"|"medium"|"low"|"lowest";
    waitMs?: number;
    startIfNotComplete?: boolean;
  };
  hideRules?:  { when: RepresentationCondition[] };
};
// step-level:      triggers?: RepresentationTrigger[]
// button block:    actions?, disabledWhen?, hiddenWhen?
// question block:  actions?
```

Cross-cutting (decided):
- **Reference entities by stable code, never internal UUID**: attribute & event by
  `codeName`, content/flow by external id, step by key/cvid, **segment by id**.
  The compiler/decompiler resolves code ↔ internal id.
- **`run_javascript` is read-only**: surfaced on read so a flow's behavior is
  visible, but **never accepted on write** (no AI/API-injected JS). The write
  validator rejects it.
- The compiler **validates references** (attribute / segment / content / event /
  step exist) and the data-type-appropriate operator — mirroring the builder's
  ValidateContext — returning model-readable errors.
- `unsupported` now only covers the tail: the internal "auto" selectors target,
  legacy time format, `task-is-clicked` (currently unimplemented in evaluators),
  and unknown / newly-added rule types.

## 6. Rich text: markdown + Liquid subset

The `text` block is a standard rich-text doc (paragraph / h1-h2 / lists / code /
bold / italic / underline / link / **user-attribute** inline). It maps to
markdown ~1:1. The two non-markdown bits:

- **User attribute** → **Liquid subset** syntax: `{{ first_name | default: "there" }}`
  compiles to the internal `{ attrCode, fallback }` node. Liquid is the de-facto
  personalization syntax and is well-known to LLMs.
  - We adopt the **syntax only**, not a Liquid engine: the internal node is
    resolved by the widget at runtime — no template evaluation, no injection
    surface. Subset = object output + `default` filter.
  - Future (optional, staged): output filters (`upcase`/`date`/…) → then a real
    sandboxed engine for `{% if %}`/`{% for %}`. That jump also requires evolving
    the stored node model; the syntax choice de-risks the *migration*, not the
    engine build.
- **Color / alignment** → not expressed in markdown (theme-driven styling).
  Preserved across writes via field-level merge (§8); only an explicit rewrite of
  the text block's content resets them. (Verified: the runtime renders `color`
  and `align`, so they must not be silently dropped on edit.)

## 7. Capability boundary (v0)

| In v0 | Out of v0 → `unsupported` / not authorable |
|---|---|
| step types: tooltip / modal / bubble / hidden | — |
| target: **selector / text** | the **"auto" selectors fingerprint** (not authorable), screenshots |
| placement: side+align(+offsets) / modal position(+backdrop/blockTarget) / width / skippable | — |
| blocks: text / image / button / embed / question / columns(+widths) | per-element styling (margin/padding/color/align) — dropped from the *view*, but **preserved on write via field-level merge (§8)** |
| button: actions[] + disable/hide conditions | — |
| questions: all 6 (as 4 kinds) + answer actions | — |
| rules: conditions / actions / triggers; start/hide rules (§5.1) | "auto" target, legacy time format, `task-is-clicked`, unknown rule types, `run_javascript` on write |

## 8. Read & write

### Read (decompiler) — `src/api/content/`, `src/api/content-versions/`
- Walk `roots → columns → elements`; single-column-single-element → a block;
  multi-column → a `columns` block; unrepresentable → `unsupported`.
- Heavy data behind `expand` (e.g. `?expand=steps`), like the existing
  `editedVersion`/`publishedVersion` expands. MCP gets this **for free** (binds
  the same service); only the list envelope differs (`{items,nextCursor}`).
- The version keeps its flat `questions` summary as a **derived field** alongside
  `content` (see §11.3) — `questions` for a quick list, `content` for the full
  body with questions in context.

### Write — same modules, add verbs (no new path)
Reuse the existing resource paths; add HTTP verbs:
```
POST   /v2/projects/:projectId/content                create content
PATCH  /v2/projects/:projectId/content/:id            update metadata (name…)
DELETE /v2/projects/:projectId/content/:id            delete/archive
POST   /v2/projects/:projectId/content-versions       create draft version (body: contentId)
PATCH  /v2/projects/:projectId/content-versions/:id   write steps/content   ← body representation blocks
```
- Granular step ops, **if needed later**, are a sub-resource under the existing
  tree (not a separate write API):
  `POST|PATCH|DELETE /v2/.../content-versions/:id/steps[/:cvid]`. v0 ships only
  the whole-version `PATCH`.

### Write layering — field-level merge, delegate persistence
```
REST POST/PATCH ─┐
                 ├─► ApiContentService.write()       (src/api, thin orchestration)
MCP write tool ──┘     1. validate representation (zod + reference & operator validation)
                       2. read the current version's internal step tree   ← merge base
                       3. FIELD-LEVEL MERGE onto the existing tree:
                          map each representation step/block to its internal element by
                          cvid / block id; overwrite ONLY the fields the representation
                          schema expresses (text, button, question, target, rules…),
                          leaving styling / "auto" target fingerprint / offsets
                          INTACT. New blocks → theme defaults; missing → deleted.
                       4. ContentService.updateContentVersion(full StepInput[])  ← domain, builder's path
                       5. decompile result → representation
```
- **Why merge, not recompile.** The representation view is intentionally lossy — it
  drops per-element styling and the "auto" target fingerprint (verified
  runtime-critical). Regenerating the whole step from it would silently reset all
  of that on every edit. So compile = *merge deltas onto the existing internal
  tree*, not rebuild. Step-level read-modify-write preserves untouched **steps**;
  block/field-level merge preserves untouched **styling within edited steps**.
- Matching keys: `cvid` for steps (also the domain upsert key — omitted steps are
  deleted, so the merge must resend the full list), `id` for blocks. Both
  round-trip on read; new steps/blocks get server-generated keys.
- The domain `updateContentVersion` is a whole-version upsert by `cvid`; the v2
  service feeds it the merged full list.
- Writes only on editable drafts (`contentVersionIsEditable` already guards
  this); publishing stays a separate, gated action — never auto-publish.

## 9. MCP reuse

- **Read**: fully reused — MCP tools return the same decompiled blocks.
- **Write (Phase 4)**: binds the same `ApiContentService.write`. Decided
  approach (§11.5): **emit-structured first** (expose the representation schema as the
  tool input — nearly free once REST write exists), **then layer intent tools**
  ("build a 3-step onboarding for X") that lower intent → representation and call the
  same write service. Either way the **compiler + schema + domain write path are
  shared**.

## 10. Phasing

- **Phase 1** ✅ (read, cheap): `content.buildUrl`, `version.themeId`; `steps`
  behind `expand=steps`. Decompiler.
- **Phase 2** ✅ (read, rich): full block decompile incl. questions/columns +
  **rules** (start/hide rules, step triggers, button/question actions &
  conditions).
- **Phase 4** ✅ (write): compiler (markdown→slate, blocks/rules→internal) +
  field-level merge + write endpoints (content CRUD, `PATCH content-versions/:id`)
  + MCP write tools. (Phase 3 = OAuth, still pending.)

## 11. Decisions

1. **`columns` block** to represent side-by-side (not flatten-to-`unsupported`).
   Multi-column rows are the norm, not an edge case — almost every multi-button
   step (Skip/Next) is a multi-column row; flattening would degrade read and make
   a standard two-button dialog unauthorable. Worth the one nesting level.
2. **Merge** star-rating + scale into `rating` + `style:"star"|"scale"`. Fields
   are effectively identical (both "pick a number in a range"); fewer kinds and
   clearer for AI. Star's default value → optional `default?`.
3. **Keep `questions` as a derived summary; coexist with `content`.** Removing it
   is a breaking change (parity / existing consumers), and a flat question list
   is genuinely useful to survey/analytics consumers (no need to walk the block
   tree). Additive: `questions` = flat summary, `content` = full body with
   questions in context.
4. **Rules (conditions / actions / triggers) are fully modeled, not deferred.**
   They are the system's core value (start/hide rules, step triggers,
   button/question behavior), so v0 designs them as typed representation unions
   (§5.1) rather than `unsupported`. Entities are referenced by stable code
   (attribute/event `codeName`, content/flow id, step key, **segment by id**),
   resolved by the compiler/decompiler. **`run_javascript` is read-only** —
   surfaced on read, rejected on write (no AI/API-injected JS). `unsupported`
   now only covers the tail: legacy time format and unknown rule types.
5. **MCP write (Phase 4): emit-structured first, layer intent later.** The
   representation schema is already AI-friendly, so exposing it as the tool input is
   nearly free once the REST write exists; high-value intent tools ("build a
   3-step onboarding for X") get added on top, lowering intent → representation and
   calling the same write service. Final call deferred to Phase 4.
6. **Round-trip fidelity = field-level merge (Phase 4 write).** The representation view
   is deliberately lossy (drops per-element styling and the "auto" target
   fingerprint, both verified runtime-critical). Writes therefore **merge deltas
   onto the existing internal step tree** (matched by step `cvid` / block `id`),
   never regenerate a step from the lossy view — otherwise every edit silently
   resets styling/targeting. v0 is read-only, so this is a write-phase
   requirement, baked in now. Corollary: the **"auto" selectors target is not
   authorable** — read shows selector/text or omits it; editing a step preserves
   an untouched fingerprint, and only an explicit new target (selector/text)
   replaces it.
7. **Condition/action model aligned to the runtime** (verified against the SDK +
   websocket evaluators): `current_url` is `includes/excludes` URL-pattern arrays
   (not op+value); `user_attribute` operators are data-type-dependent (string/
   number/boolean/list/datetime); `event` carries `scope`, range `count2`, and a
   nested `where` filter on event attributes (the old `event-attr` folds in);
   `text_filled` has no op/value; `wait`/`task-is-clicked` are not authorable
   conditions (wait lives in start-rules/trigger; task-is-clicked is unimplemented).
