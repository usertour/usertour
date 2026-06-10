# Content representation (codec) naming

How the v2 content **representation** subsystem is named — and how to name any
future one. The representation is the public, intent-level shape of content that
the v2 API and the MCP tools read and write, distinct from the internal builder
model (`ContentEditorRoot[]` + step fields + recursive rules).

Full design + locked decisions: `docs/architecture/content-representation.md`.

## The rule

1. **Concept = `representation`** — not "authoring". It serves **both read and
   write**, so a write-leaning word is wrong. "Representation" is the REST term
   (the body a client GETs / PUTs, vs internal storage) and matches peer projects
   (teable `Vo`, Outline `presenter`).

2. **The subsystem is a codec** between internal ↔ representation, with one
   matched verb pair used everywhere:
   - **`decompile`** — internal → representation (read)
   - **`compile`** — representation → internal (write)

   Mnemonic: the internal tree is the "compiled / runtime" form; the
   representation is the "source / authorable" form.

3. **File layout**, per area:
   - `<area>.schema.ts` — the zod contract + types (`Representation*`)
   - `<area>.decompile.ts` — internal → representation
   - `<area>.compile.ts` — representation → internal

   Areas today (`apps/server/src/api/content-representation/`): `representation`
   (the step/blocks orchestrator), `rules`, `target`, `text`. The leaf format codec
   is `text.decompile.ts` (slate → markdown) / `text.compile.ts` (markdown → slate).

One-line memory: **representation is the noun; compile/decompile are its two
directions; each area is one pair of files.**

## Where it lives, and when to share

The codec is its own resource folder — three flat siblings under
`apps/server/src/api/`:

- `content/` — the **Content envelope** only (`content.{schema,mapper,service,
  controller}.ts`): id, name, type, buildUrl, per-environment publish state.
- `content-versions/` — the **version resource** (`content-versions.{schema,
  mapper,service,controller}.ts`): the editable body, list/get/write.
- `content-representation/` — the **codec + the version's representation shape**:
  `representation.*`, `rules.*`, `target.*`, `text.*`, plus the `contentVersion` /
  `question` zod shapes (they embed `steps` / start- / hide-rules, which *are*
  representation).

Dependency: `content → content-representation ← content-versions`. The two
resources never import each other — the shared shape lives in the codec, so the
graph stays acyclic. The codec is a sibling, **not** in `shared/`: `shared/` is
for genuinely cross-resource utilities (pagination, sort, object-type,
validation pipe — every resource uses them), whereas the representation is
content-specific (only these two resources touch it).

Content is currently the **only** resource with a non-trivial representation —
every other v2 resource is a near-1:1 `schema.ts` + `mapper.ts` projection and
needs no codec, so this convention only applies once an internal model is complex
enough to warrant a designed, bidirectional, lossy representation.

`rules.*`, `target.*`, and `text.*` are named **without** a `content` prefix on
purpose: when a second consumer appears (e.g. segments reuse the rules codec —
segment `CONDITION` data is the same `RulesCondition[]`), move them to
`apps/server/src/api/shared/` unchanged.
