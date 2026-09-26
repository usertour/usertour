# 0020: Random bucketing attributes — Random A/B and Random number

- **Date:** 2026-09-26
- **Status:** Accepted

## Context

Two attribute data types have existed in the schema since the project was open-sourced without ever being implemented: `RandomAB` (6) and `RandomNumber` (7) in `BizAttributeTypes`, a `randomMax` column on `Attribute` (default 1), the public names `random_ab` / `random_number` on the v2 surface, a type chip, an icon and i18n strings. What they are for is well understood: a **bucketing** attribute is a value the system assigns to each user at random, once, and never changes — `A` or `B` for an A/B test, an integer in `[1, N]` for multi-way splits and canary rollouts ("`rollout <= 10` sees the new flow"). Two properties define them: the value is **stable** for a user (a flow whose start condition flips between evaluations would appear and vanish in front of the user), and it is **read-only** (neither the SDK nor the API may write it).

What exists is a shell:

- Nothing generates a value. User creation seeds `first_seen_at` / `last_seen_at` and nothing else.
- Nothing can create such a definition: the web dialog offers five types; the v2 schema says the two "cannot be created through the API"; `randomMax` is not exposed anywhere.
- Conditions cannot use them: `evaluateAttributeCondition` (shared by the SDK and the server) and the segment filter `createFilterItem` dispatch on the exact data type and fall through to `false` for 6 and 7; the operator picker falls back to the String operator set for both, which is wrong for a number.
- Writes are already refused (ADR 0017: `coerceAttributeValue` returns a mismatch for 6 and 7), but the reason reads "type mismatch", and on the SDK path the key is dropped silently.

That last point surfaced a gap that is not specific to bucketing. A write to a read-only attribute through another vendor's SDK rejects the returned promise with a structured error that names the attribute, the type and what to do, and the console shows the message the client sent next to the server's answer. Here the same call drops the key server-side, acknowledges `true`, and `updateUser()` resolves as if everything was written; the only trace is a gated log. ADR 0017's choice — a high-volume identify must not fail as a whole over one bad field — stands; the caller learning nothing does not.

## Decision

### 1. The value is an ordinary stored attribute

A bucket is written into `user.data[codeName]` (and `company.data` for company scope) exactly like a customer-supplied attribute. Every reader — condition evaluation, segment filters, webhook payloads, the users table, exports, analytics — already reads that jsonb; none of them changes.

### 2. The value is derived, not drawn

`u = hash(attribute.id ‖ externalId) / 2^32` is a stable point in `[0, 1)` per user and attribute; Random A/B is `u < 0.5 ? 'A' : 'B'`, Random number is `1 + floor(u × randomMax)`. A fast non-cryptographic 32-bit hash with a uniform distribution; the function is pure and lives in `@usertour/helpers` with table-driven tests (distribution over a large sample, determinism, the `A`/`B` and range mappings). Mapping through `u` rather than `hash mod N` keeps buckets *monotone in `N`*: the users below any percentage threshold are the same set whatever `N` is, which is what would make a later change of `randomMax` survivable (§5 still locks it — see Triggers).

Deriving instead of drawing is what makes the two defining properties free:

- **Stability** is arithmetic. Recomputing always yields the stored value; there is no "assigned twice" state and no race between two connections creating the same user.
- **A new definition has an answer for every existing user immediately.** Backfill only materialises what the formula already says.
- The hash key is the **external id**, so a user deleted and re-created, or the same person in a staging and a production environment (definitions are per project, shared across environments), lands in the same bucket. This treats the external id as the stable identity, which is the assumption everywhere else in the product.

### 3. Three moments write the value

1. **At birth.** Every place a user or company row is created — `ensureBizUser`, the two upsert create branches, `createMissingBizUsers` on the track path, the company create branch — seeds every bucketing definition of the project next to `first_seen_at`.
2. **At definition creation.** A background job (the BullMQ processor pattern the integrations use) walks the users — or companies — of every environment in the project in batches and writes the key where it is missing. It is idempotent and safe to re-run.
3. **At read time, as a fallback.** Condition evaluation that finds a bucketing definition whose value is missing on the entity computes it in place without writing. This covers the window before the backfill has reached a row. Segment filters run in SQL and cannot compute a hash, so during that window a segment on a fresh definition may under-count; that is the one accepted transient.

### 4. Conditions treat them as the type they resemble

An `effectiveDataType` mapping in `@usertour/helpers` — `RandomAB → String`, `RandomNumber → Number` — is applied in `evaluateAttributeCondition` and in the server's `createFilterItem`. The operator picker follows suit for a Random number (the full Number set) but not for a Random A/B: substring operators mean nothing on a two-value vocabulary, so it offers `is` / `is not` only, with the value a two-way choice of `A` or `B` in the editor. A Random number condition's input is bounded to `[1, randomMax]` in the editor.

### 5. Definitions can be created; values cannot be written

- **Web**: the two types join the dialog; choosing Random number reveals "Between 1 and N" bound to `randomMax` (lower bound fixed at 1, `N` from 2 to 10 000); an information panel states what the type does. The type is locked once created.
- **GraphQL and v2 / MCP**: `randomMax` is exposed on the definition model and accepted on create for `random_number`; `create_attribute_definition` accepts both types and the "cannot be created" note goes away. The retype guard refuses any change into or out of the two types — a bucket is not a value that "fits" another type, and a re-typed definition would silently re-bucket everyone.
- **Scope**: user and company. Membership and event are refused: a membership bucket has no known use, and an event is an immutable fact, not something to split on.
- **Writes**: `judgeAttributeWrite` names the refusal — *"`<codeName>` is a system-generated attribute and cannot be set; use another attribute name"* — so the v2 400 and the SDK's warning say why, not "type mismatch".

### 6. The upsert acknowledgement carries the refused keys

`UpsertUser` and `UpsertCompany` acknowledge with `{ ok: true, rejected: [{ codeName, reason }] }` instead of a bare boolean. The accepted keys are written as today; the refused ones travel back with the same reason the server logged. The SDK's `identify()` / `updateUser()` / `group()` / `updateGroup()`:

- still **resolve** — the write did succeed for every other key, and a rejection would make hosts retry an identify that already worked;
- log one `warn` per refused key with its reason (gated by ADR 0019's switch; the host has the return value as its own channel, so this does not meet the `critical` bar);
- return `{ rejected }` so a strict host can check.

The v2 REST path keeps its whole-request 400 (ADR 0017): it has no per-key contract and no reason to gain one.

The first refusal reasons to ride this channel are the bucketing ones; the shape is generic and will carry every other reason `judgeAttributeWrite` produces.

### 7. Documentation

The attribute-type table in the SDK reference gains the two rows; a short section shows an A/B test (two flows keyed on `is A` / `is B`) and a canary (`<= 10`), and states that the values are assigned by Usertour, stable per user, and cannot be set from code — with the warning a host will see if it tries.

## Consequences

- Two attribute types that have been half-present for a year become usable end to end, with no change to any consumer of attribute values.
- Every user and company row created after this carries the project's bucketing values; existing rows are backfilled per definition, once, in the background.
- The user's external id becomes the bucketing identity, deliberately: buckets survive deletion and cross environments.
- A definition's type and `randomMax` are locked after creation. Changing the type would turn buckets into values of another kind; changing `N` would silently change the meaning of every existing condition (`<= 10` means 10 % at `N = 100` and 1 % at `N = 1000`). A different split is a new attribute.
- The upsert acknowledgement changes shape; the SDK on the CDN and the server ship together, and a self-hosted server that is older simply keeps acknowledging `true`, which the SDK treats as "nothing rejected".
- A segment over a brand-new bucketing definition may under-count until its backfill completes.

## Alternatives Considered

- **Draw a random value and store it once.** Needs "assign exactly once" semantics under concurrent creation and a backfill that draws per row; and a lost row cannot be reconstructed. The hash gives stability, determinism and reconstructability for nothing.
- **Compute at read time only, never store.** Segment filters run in SQL and cannot evaluate a hash; every other reader would have to learn a new value kind. Storing makes the type invisible downstream.
- **Hash on the internal row id.** Buckets would change on delete-and-recreate and differ between environments for the same person. The external id is what the customer thinks of as the user.
- **Allow re-bucketing (a "reshuffle" action or an editable `randomMax`).** Breaks the stability the type exists for; no request for it.
- **Reject the whole upsert when any key is refused** (the other vendor's behaviour). Rejecting an identify that succeeded for every other key makes hosts retry and misread a working user as unidentified; ADR 0017's per-key tolerance stands, with §6 closing the information gap it left.
- **Surface a refused write as `critical`.** The host has the return value; ADR 0019 reserves the unconditional tier for failures with no other channel.
- **Membership and event scope.** No use case; an event cannot be bucketed.

## Triggers to Revisit

- A customer needs weighted or multi-variant splits beyond a uniform `[1, N]` → a `RandomList` type (weighted named variants) built on the same hash.
- A customer needs to move a user between buckets deliberately (support override) → an explicit, audited override stored beside the derived value, never a reshuffle.
- Segment under-count during backfill is observed to matter → compute the bucket in SQL (`hashtext`) for segment filters as well.
- A customer needs finer granularity on an existing Random number attribute → allow *raising* `randomMax`: because buckets derive from `u`, the population under any percentage stays the same users, so the change is a backfill plus a documented rewrite of thresholds in existing conditions. Lowering stays refused.
- The hash's distribution proves uneven on real external ids → swap the function; the stored values are recomputed by the same backfill job.
