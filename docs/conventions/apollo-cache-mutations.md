# Apollo cache: mutations and refetch

With the normalized cache (ADR [0006](../adr/0006-normalized-cache-and-mutation-updates.md))
the default way a mutation propagates to the UI is **through the cache**, not
through a manual `await refetch()`. This doc states the rule for the common
case, the exceptions where the cache can't do it alone, and the anti-pattern we
keep re-learning: papering over an under-returning mutation with a refetch.

## The rule

**An `update*` mutation that edits an existing entity in place must return
`id` + every field it can change. The consumer then relies on the normalized
cache and does NOT manual-refetch.**

Apollo merges the mutation response into the cached entity by `__typename:id`,
overwriting whatever fields the response carries. If the response selects only
`{ id }`, the cached entity keeps its **stale** fields — and the only way to see
the new value becomes a refetch. Returning the changed fields is strictly
better: no extra round-trip, and every observer of that entity (list rows,
detail panels on other pages) re-renders at once.

Mirror the field set the consuming queries read. Example fix — `updateVersionLocationData`
selected only `{ id }`, so toggling a locale's `enabled` couldn't reflect
without a refetch; expanding it to `{ id, enabled, localized, backup, updatedAt }`
(the list query's editable fields) let the toggle update through the cache and
the refetch was deleted.

## When "return the fields" is NOT enough

Returning the entity covers an **in-place field edit of one existing row**.
It does nothing for these — they still need `cache.modify` / `cache.evict` or a
refetch, no matter how complete the response is:

| Situation | Why the returned entity isn't enough | Mechanism |
|---|---|---|
| **List add (create)** | Apollo can't place a new entity into a paginated connection / array — it doesn't know the position or which query's filter it matches | `cache.modify` to insert the ref, or refetch the list |
| **List remove (delete)** | Same — the row must be removed from the connection, not just patched | `cache.evict` + `cache.gc()`, or refetch the list |
| **Server-derived / aggregate field** | Counts, rollups, `isOverLimit`, analytics depend on global state the mutation payload can't carry | refetch the query that exposes the derived field |
| **Create-then-select ordering** | A follow-up synchronous step reads the new row from a *separate* list query; the entity being returned doesn't put it in that list | awaited refetch (see below) or `cache.modify` |
| **Cross-entity side effect** | The mutation changes another query's data (e.g. transfer-owner changes the *viewer's* capabilities, not just the member row) | refetch the affected query |

## `refetchQueries` is fired, not awaited

`useMutation({ refetchQueries })` triggers the refetch but does **not** wait for
it (`awaitRefetchQueries` defaults `false`). So after `await mutate()` the list
may not yet contain the new/updated row. This is the trap behind
**create-then-select**: a create whose `refetchQueries` refreshes the list does
NOT guarantee the new row is present when the next line selects it by id — the
selection flashes empty until the refetch lands.

When a step must read fresh data *before* the next synchronous step (e.g. create
an event, then `onSelect(newId)` against the event list), keep an explicit
`await refetch()` at the call site, or write the row into the cache
synchronously with `cache.modify`. The tracker event selector and the
integration object-mapping panel keep their awaited refetch for exactly this
reason.

## Anti-pattern

Don't keep a manual refetch to compensate for an edit mutation that returns too
little. Fix the mutation's selection set instead — a refetch hides the real
problem (an under-returning mutation) behind a round-trip, and the next reader
of that mutation copies the pattern. The fix is one line of GraphQL selection,
not a network request on every edit.

## See also

- ADR [0006 — normalized cache + mutation `update` callbacks](../adr/0006-normalized-cache-and-mutation-updates.md) (the decision and the `update(cache)` patterns for list add/remove)
- ADR [0005 — Apollo cache strategy](../adr/0005-apollo-cache-strategy.md) (superseded; the prior `refetch()`-everywhere baseline)
- [List pagination conventions](./list-pagination.md) (the connection typePolicies the list-add/remove cases write into)
