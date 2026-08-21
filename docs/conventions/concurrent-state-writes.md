# Concurrent state writes (server)

This doc covers one class of server code: **a shared mutable row written by
multiple concurrent writers** — queue workers running at `concurrency > 1`,
user actions from the dashboard/API, cron jobs, all touching the same fields.
Examples in the tree: the webhook circuit-breaker state (`consecutiveFailures`,
`cooldownUntil`, `failingSince`, `autoDisabledAt` on `Webhook`) and the
`OutboundMessage.status` machine (ADR
[0010](../adr/0010-outbound-webhooks.md)).

It exists because the webhook breaker cost us three review rounds of race
conditions that one systematic pass would have caught. The rules below are
what that convergence settled on; apply them as a **pre-flight at design
time**, not as fixes after a reviewer finds the interleavings one by one.

## The pre-flight (do this in the ADR, before implementing)

For every piece of shared mutable state, write down three lists:

1. **Writers** — every code path that writes any of the fields (each worker
   outcome branch, each user mutation, each cron). Concurrency = writers × the
   worker pool size.
2. **Invariants** — statements that must hold across any interleaving
   (e.g. "streak 0 ⇒ `failingSince` is null", "PENDING ⇒ exactly one job
   in flight", "breaker state describes the CURRENT url").
3. **Per write: the mechanism** — which rule below makes this write preserve
   every invariant. "It's unlikely" is not a mechanism.

When a review later finds ONE race in this state: stop, redo the three lists,
and prove every writer again. Races come in families; fixing the reported
instance and waiting for the next report is how one design issue turns into
four fix rounds.

### 0. New value, new state, new sentinel → enumerate its consumers first.

Not a concurrency rule but the same failure shape one layer up: whenever a
change introduces a new value into an existing field's domain (a sentinel
like `''`), a new state, or tightens one side of a symmetric pair (one
surface's validation, one toggle direction), sweep everyone who reads the
old contract before shipping. The webhook rounds paid for this twice: a
`''`-sentinel secret met a truthiness-gated render and hid the one
self-heal button; a mutation stopped refetching without checking that its
consumer query was even ON the cache.

## Rules

### 1. Never read → decide → write. The decision inputs go into the WHERE.

A plain `read, if(...), update` on shared state is a lost-update bug waiting
for a reviewer. Every fact the write depends on must be re-asserted **in the
write itself**:

```ts
// The window was computed from streak N — arm it only if the streak is still N.
const { count } = await this.prisma.webhook.updateMany({
  where: { id, consecutiveFailures: row.consecutiveFailures },
  data: { cooldownUntil: new Date(Date.now() + windowMs) },
});
```

Known accepted exception: `WebhooksService.update()`'s breaker resets are
read-decide-write on purpose — the race window is a user edit in the same
second as a worker write, and the worst case is cosmetic (evidence fields
cleared behind a banner; the enabled/autoDisabledAt machine stays guarded).
Recorded in ADR 0010's close-out edges — do not re-report it as a bug.

In Prisma this means `updateMany` + a `count` check: `update`'s WHERE only
accepts unique keys, so any conditional write is an `updateMany` even for one
row (and a follow-up `findUnique` when you need the post-write row — accept
the extra read, it usually rides an error path).

**`count === 0` is a real outcome, not an error.** Decide explicitly what
losing the race means at each site (skip silently / throw / log-debug) and say
so in a comment.

### 2. A guard must cover every field it clears or writes.

Guarding on a subset lets a concurrent writer of the *other* fields interleave
and strand inconsistent state. The breaker reset matches all three fields it
clears — matching only the streak left an orphaned `failingSince` stamp that
would later age into a false "7 days of sustained failure"
(`webhooks.processor.ts` → `resetBreaker`).

### 3. State transitions are CAS: expected-from state in the WHERE.

A transition writes the *to* state and asserts the *from* state in the same
statement — `status: { in: ['DELIVERED', 'FAILED'] }` → `PENDING` for resend
claims, `enabled: true` → `false` for auto-disable. A concurrent transition
then loses at the database instead of double-firing the side effect
(`outbound-ledger.service.ts` → `claimForResend`; `webhooks.processor.ts` →
`autoDisable`).

### 4. Same state ≠ same generation (ABA). Key the CAS on `updatedAt`.

If a row can leave a state and come back to it, asserting the state alone is
not enough: a claim read before a full settle-and-resettle cycle would still
match. Put the row's `updatedAt` **as read** into the WHERE — every settlement
bumps it, so a stale claim loses (`claimForResend(id, asOf)`), and derive
idempotency keys from the same generation (`resend-<id>-<updatedAt ms>`), not
from a counter another writer may have moved.

### 5. Bind bookkeeping to the input it was computed from.

Some guards are semantic, not just anti-lost-update: a result computed against
one configuration must not be booked against another. Breaker increments and
resets carry `WHERE url = <the url this delivery actually hit>`, so up to
concurrency-many stragglers for a just-replaced URL can't stack a cooldown
onto the new target (`recordFailedAttempt` / `resetBreaker`). Ask of every
write: *which inputs was this decision computed from, and are they still
true?* — then assert them.

### 6. Rollbacks are guarded writes too.

Compensation after a failed step (enqueue threw after a claim) must assert the
state it is compensating *from* — by the time it runs, a worker may already
have settled the row (`releaseResendClaim` only restores when still PENDING).
An unconditional rollback is itself a racing writer.

### 7. Bookkeeping never breaks the primary path.

Breaker/ledger writes wrap in try/catch and log; a delivery must not fail
because its bookkeeping did. Treat "row deleted meanwhile" (`P2025`) as a
benign race, not an error.

## What NOT to reach for

- **A version-column optimistic lock on the whole row** is not the default
  answer. When the operation spans seconds (a delivery with its retry ladder),
  unrelated legal writes move the version and cause false rejections.
  Field-specific guards assert exactly what the decision depends on — nothing
  more. Row-level versioning fits only short read-modify-write cycles over the
  whole row (the `updatedAt` CAS in rule 4 works because message settlement
  really does invalidate any older claim).
- **`SELECT ... FOR UPDATE` transactions** would serialize the same logic as
  straight-line code, but need `$queryRaw` in Prisma and hold locks across the
  decision. Equivalent behavior, more machinery; use guarded writes unless the
  decision genuinely can't be expressed as WHERE conditions.
- **Fixing the reported interleaving only.** The anti-pattern this doc exists
  for. One confirmed race ⇒ re-run the pre-flight over all writers of that
  state.

## Reference implementations

- `apps/server/src/webhooks/webhooks.processor.ts` — `resetBreaker` (rules 2,
  5, 7), `recordFailedAttempt` (rules 1, 5), `autoDisable` (rule 3).
- `apps/server/src/outbound/outbound-ledger.service.ts` — `claimForResend`
  (rules 3, 4), `releaseResendClaim` (rule 6).
- `apps/server/src/webhooks/webhooks.service.ts` — `resendMessage` (rule 4's
  generation-keyed jobId, rule 6's guarded rollback).
