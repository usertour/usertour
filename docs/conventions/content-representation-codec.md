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

   Areas today (`apps/server/src/api/content/`): `representation` (the
   step/blocks orchestrator), `rules`, `target`, `text`. The leaf format codec is
   `text.decompile.ts` (slate → markdown) / `text.compile.ts` (markdown → slate).

One-line memory: **representation is the noun; compile/decompile are its two
directions; each area is one pair of files.**

## Where it lives, and when to share

Content is currently the **only** resource with a non-trivial representation —
every other v2 resource is a near-1:1 `schema.ts` + `mapper.ts` projection and
needs no codec, so this convention only applies once an internal model is complex
enough to warrant a designed, bidirectional, lossy representation.

`rules.*`, `target.*`, and `text.*` are named **without** a `content` prefix on
purpose: when a second consumer appears (e.g. segments reuse the rules codec —
segment `CONDITION` data is the same `RulesCondition[]`), move them to
`apps/server/src/api/shared/` unchanged.
