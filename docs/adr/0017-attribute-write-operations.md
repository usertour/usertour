# 0017: Attribute write operations — set_once, add, union, remove, data_type

- **Date:** 2026-09-25
- **Status:** Accepted

## Context

User, company, membership and event attributes are written through four entry points — the SDK (`identify` / `updateUser` / `group` / `updateGroup` / `track`), the v2 REST API, MCP, and integration sync — and all of them end in `BizService.resolveAttributes` plus a merge step. Today the write model is:

- **Literal values only** (string / number / boolean / list). A new `codeName` auto-creates its definition with a type **inferred from the first value**; a string is inferred as DateTime only when it is exactly the `Date.prototype.toISOString()` shape (`Z` suffix, 0 or 3 fraction digits).
- **Exact type match** against an existing definition. There is no coercion: a String attribute drops a number, and also drops an ISO-shaped string (inferred DateTime ≠ String). The SDK path drops and logs; v2 and MCP return 400 (`assertAttributeValueTypes`).
- **`null` removes the key** from the entity's jsonb (`filterNullAttributes`). A `null` for an unknown `codeName` creates nothing. `''` is an ordinary value. Two gaps: a membership row *created* with a `null` stores JSON null (the create branch skips the filter), and v2 silently drops a `null` aimed at an integration-owned attribute where a non-null value would be refused.
- **Read-modify-write of the whole jsonb, without a transaction or a row lock** on the SDK path (deliberately — see the comment in `WebSocketV2Service.upsertBizUsers`).
- **Client-side dedup.** `updateUser` / `updateGroup` skip the call when `isEqual(cached, merged)`; the cache only records what this page already sent. The SDK never sees the server's current value.

Meanwhile the public typings — `usertour.js` on npm and `packages/types` — have declared an `AttributeChange` operation object (`set / set_once / add / subtract / append / prepend / remove / data_type`) since 2026-01, and the server implements none of it. Sending an operation object today either creates a definition with `dataType = Nil` and stores the object verbatim (new `codeName`), or is dropped as a type mismatch (existing one).

Three facts drive the decision:

1. **The typings are a published promise** and the current behaviour under them corrupts data.
2. **Two of the operations cannot be emulated by a client.** "Set only if absent" and list add/remove need the current server value, which the SDK does not have. They must be computed server-side.
3. **A survey of analytics platforms, document databases, Prisma, JSON Patch (RFC 6902) and JSON Merge Patch (RFC 7386)** (2026-09-25, official documentation only) shows: (a) a per-field operator object is a recognised shape (Prisma: "one atomic update per field, per query"); (b) `append` almost universally means *duplicates allowed*, while dedup-append goes by names like `addToSet` / `arrayUnion` / `union`; (c) `null` = remove is the JSON Merge Patch reading and common in CDPs; (d) no platform offers an idempotency key for profile increments, and one explicitly warns increments are not idempotent; (e) increment-on-bad-value behaviour differs everywhere (error / silent skip / overwrite / start at 0), so it has to be specified by us.

## Decision

### 1. Shape

An attribute value is `literal | null | { <operation>: value }`. The operation is written **per attribute** — one key, one operation — so a conflicting pair on the same key is structurally impossible and no precedence rule exists. The same JSON is valid on the SDK, v2 REST and MCP.

An object counts as an operation only when it is a plain object with **exactly one** operation key from `set`, `set_once`, `add`, `union`, `remove`, optionally plus `data_type` next to `set` / `set_once`. Every other object is invalid: the SDK path drops the key and warns; v2 and MCP return 400. This also closes the `Nil`-definition hole.

### 2. Vocabulary

| Value | Semantics |
|---|---|
| literal / `{set: v}` | Set. `set` exists to carry `data_type`. |
| `null` | Remove the key. "Removed" and "never set" are the same state; a stored JSON null does not exist. |
| `{set_once: v}` | Write only when the key is absent. Works again after a removal. |
| `{add: n}` | Numeric add; `n` may be negative; a missing key starts at 0; `n` must be a finite number. |
| `{union: v \| v[]}` | Dedup-append: elements not yet present are appended in order; existing order is kept; a missing key starts as `[]`. |
| `{remove: v \| v[]}` | Remove every matching element. A missing key is a no-op and creates **no** definition. Emptying leaves `[]`. |

Dropped from the published typings: `subtract` (an `add` of a negative number), `prepend` (list conditions are `includes` / `empty` / `any` — order is never observable), and `append` (renamed `union`, because `append` conventionally means duplicates allowed and our lists are sets in every consumer).

### 3. Types and coercion

**Inference (auto-creating a definition) stays strict.** The operation decides the type where it can: `add` → Number, `union` / `remove` → List. `set` / `set_once` and literals infer from the value with the existing rule, or take `data_type` when given. The DateTime inference rule is *not* widened: widening it would make messy string fields more likely to be pinned as DateTime by an unlucky first value.

**Acceptance (definition exists) changes from "inferred type equals defined type" to "the value fits the defined type losslessly":**

| Target type (definition, or `data_type`) | Accepted values |
|---|---|
| String | any string (ISO-shaped included); number and boolean, stringified |
| Number | number; a numeric string only when lossless (`String(Number(s)) === s`) |
| Boolean | boolean; `'true'` / `'false'` |
| DateTime | any ISO 8601 (any offset, any fraction digits), normalised to UTC `Z` with millisecond precision; a value already in the strict UTC form (`…:00Z` / `…:00.000Z`) is stored as sent, so values stored before this ADR never look changed |
| List | array; a scalar wrapped as `[scalar]` |

Not coerced, by design: epoch numbers (seconds vs milliseconds is ambiguous), localised date strings, lossy numeric strings such as `'007'`. A value that does not fit is a type mismatch: SDK drops and warns, v2 / MCP return 400.

**`data_type`** is allowed only with `set` / `set_once` (and on event attributes with `set`). It has exactly one job: **decide the type when the definition is first auto-created**, replacing inference — the case it exists for is a string field whose first value happens to look like a date or a number. The value is coerced to `data_type` through the table above; a value that cannot be coerced is a mismatch and creates nothing. When the definition already exists with a different type, `data_type` **never** changes it — a browser-originated request must not retype a project-wide definition — and the write is a mismatch; the v2 error names the defined type and points to the definition settings. Documentation states the rule in one line: *`data_type` only decides the type when the attribute is first created.*

`Date` joins the literal type in the public typings; it serialises to the strict ISO shape and infers deterministically as DateTime.

### 4. Concurrency

Every user / company / membership write — **including pure literal writes** — runs in a transaction that first takes the entity row with `SELECT … FOR NO KEY UPDATE`, then computes the merge in TypeScript, then writes. NO KEY rather than plain FOR UPDATE: the row's key never changes, and an insert of a membership or an event takes `KEY SHARE` on the user and company rows through its foreign keys — FOR UPDATE blocks that insert, and two writers locking user and company in opposite orders deadlocked. A company write that changes nothing (most `group()` calls) returns after an unlocked read and never takes the lock. Locking only operation-bearing writes is not enough: an unlocked literal write reads the whole jsonb and writes it back, overwriting a concurrent `add`. The merge is not pushed into a single SQL expression: type validation, the "unchanged → no write, no webhook" short-circuit and the webhook `previousAttributes` diff all live in TypeScript and would have to be duplicated.

Cost: one extra transaction round trip on the identify hot path; the lock waits only when the same entity is written concurrently. Ingest latency is to be watched after rollout.

### 5. Idempotency

Only `add` is non-idempotent. The SDK does not retry (`emitWithAck` has no retry configuration); a double count needs a lost ack *and* a customer-side retry. No idempotency key is introduced. Documentation says: for exact counts, track an event — the "occurred ≥ N times, optionally within a window" event condition already exists.

An unchanged result is not written and emits no `*.updated` webhook; the existing `isEqual` short-circuit covers e.g. `set_once` on a present key.

### 6. SDK runtime

- **Change detection:** a key carrying an operation object is always sent. After success its key is *cleared* from the local attribute cache (the client does not know the resulting value); only literals are cached.
- **Compatibility layer**, in the runtime (which every customer loads from the CDN, so it covers everyone) and warning on the console: `subtract: n` → `add: -n`; `append` / `prepend` → `union`; a numeric string in `add` → number, else dropped. `set` and `data_type` need no translation. The server accepts only the vocabulary in §2. The layer is deleted when the deprecation period ends.

### 7. Public typings (`usertour.js` and `packages/types`, kept identical for this section)

`AttributeOperation` is a union whose members use `?: never` on the other keys, so "exactly one operation" is enforced by the type checker; `set` / `set_once` carry `data_type?`; `add` accepts `number` only. `subtract` / `append` / `prepend` move to a `LegacyAttributeChange` type, each `@deprecated` with its replacement. `EventAttributes` accepts literal, `Date`, or `{set, data_type?}`. JSDoc states the minimum server version, because a self-hosted runtime follows the deployed server while npm serves the newest typings.

### 8. Coverage

| Path | Rule |
|---|---|
| user / company / membership | full vocabulary; a membership row created from a payload filters `null` like the update branch does (a stored JSON null would make `set_once` see a value) |
| event attributes | literal, `Date`, or `{set, data_type}` — events are immutable facts, no other operation applies; the first-value pinning problem exists here too |
| v2 REST / MCP | same domain implementation; OpenAPI describes the value as `oneOf`; a `null` aimed at an integration-owned attribute returns 400 like any other write to it |
| integration-owned attributes | operations are refused exactly as literals are |
| integration sync | unchanged, literals only |

The rules live in the domain layer (`BizService` attribute resolution), not in the WebSocket payload validators (`@IsObject()` stays) nor in the v2 zod schema beyond shape documentation: the WebSocket layer rejects whole messages, whereas the SDK contract for a bad value is "drop this key, write the rest", and v2 / MCP do not pass through that layer at all.

### 9. Rollout order

1. Server.
2. SDK runtime — its compatibility layer emits standard operations, which the server must already understand.
3. `usertour.js` typings and documentation last. Shipping typings before the implementation is how the current gap was created.

## Consequences

- Attribute writes gain four server-computed operations with one vocabulary across SDK, v2 and MCP, and the published typings become true.
- Object values can no longer create `Nil` definitions or land verbatim in jsonb. Any tenant that relied on that (a production check for `dataType = 0` definitions is a precondition of the rollout) sees a behaviour change.
- Existing type-mismatch drops for values that were merely un-coerced (number into String, ISO string into String, offset ISO into DateTime) stop happening — a silent widening in the customer's favour.
- Every attribute write now takes a row lock; identify latency gains a transaction round trip.
- `add` can double-count under a lost ack plus customer retry; documented, not prevented.
- `data_type` cannot repair a wrongly inferred definition; the definition settings (with the existing E1017 stored-value guard) remain the only retype path.
- Three typings are deprecated and translated in the runtime for a deprecation period; deleting the translation later is a breaking change for anyone still on them.

## Alternatives Considered

- **Top-level operator groups** (`{$set: {…}, $add: {…}}`) — needs a precedence rule for the same key in two groups (silently dropping the later one, or letting set shadow set_once, are the documented behaviours elsewhere); breaks the already-published per-attribute typings for no gain.
- **Removing `data_type` altogether**, relying on definition-driven coercion plus pre-created definitions plus native types (`String(v)`, `Date`). Rejected: inference sniffs string *content* for DateTime, so a messy string field whose first value looks like a date gets pinned wrong, and only an in-call declaration can prevent that across every project the code runs in. Retained with its scope narrowed to first creation.
- **Letting `data_type` retype an existing definition.** Rejected: a browser-originated request would change a project-wide definition and break every condition on it.
- **Widening DateTime inference** together with acceptance. Rejected: it enlarges exactly the mis-pinning the previous point guards against; only acceptance is widened.
- **Keeping `append` (dedup) as named.** Rejected: the name contradicts its meaning in every other system surveyed; it has never functioned, so the rename is free now and costly later.
- **Keeping `prepend` / `subtract`.** Rejected: no consumer observes list order; `subtract` is `add` of a negative.
- **Locking only operation-bearing writes.** Rejected: an unlocked literal write still overwrites a concurrent increment.
- **Single-statement jsonb update (`jsonb_set` / `||` / `-`)** for atomicity without a lock. Rejected for now: validation, the unchanged-short-circuit and the webhook diff would be reimplemented in SQL. Recorded as a future option.
- **Idempotency key for `add`.** Rejected: no surveyed platform has one; the SDK does not retry; exact counting is what events are for.
- **Validating operation shape in the WebSocket payload validators / v2 zod schema.** Rejected: rules must be shared by three entry points, and the SDK contract is per-key drop, not whole-message reject.
- **Operations on event attributes.** Rejected: an event is an immutable fact; only `set` + `data_type` (type pinning) applies.

## Triggers to Revisit

- Ingest latency regresses measurably from the row lock → move the merge into a single jsonb statement (alternative above).
- A real customer need for list order (ordered timelines, "last N") → add `append` (duplicates allowed) and `prepend` with a defined ordering; do not repurpose `union`.
- Evidence of double-counted increments in production → introduce an idempotency key on the upsert message (`requestId` already travels with every message and is unused server-side).
- Demand for `min` / `max` or epoch parsing → extend the per-attribute object; the shape accommodates new keys without a break.
- The deprecation period for `subtract` / `append` / `prepend` ends → delete the SDK translation and the `LegacyAttributeChange` typings.
