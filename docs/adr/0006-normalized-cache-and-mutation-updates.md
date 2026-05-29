# 0006: Enable normalized cache + adopt mutation `update` callbacks

- **Date:** 2026-05-29
- **Status:** Accepted
- **Supersedes:** [0005](./0005-apollo-cache-strategy.md)

## Context

ADR 0005 set up `SHARED_CACHE_QUERY_OPTIONS` (cache-first) as a per-call-site opt-in to cache participation, with mutations refreshing lists via explicit `await refetch()`. That ADR named three triggers for re-evaluation:

1. Cross-tab / cross-device freshness becoming a recurring UX bug.
2. Manual `refetch()` count growing past ~50.
3. A new app consuming `@usertour/hooks` under a different Apollo default.

Trigger #2 has fired: `grep -rEn "\brefetch\(\)" apps/web/src` returns **59 call sites** today (2026-05-29). The v0.8.4 release also concentrated heavy refactor work into `settings/*` and `pages/{users,companies}/*` — a second pass over the same files for cache mechanics is exactly what we want to avoid.

A real reconnaissance pass (rather than estimation) shows that the cache-write surface is much smaller than the codebase size suggests:

| Surface | Touches cache today? |
|---|---|
| Global `apollo/index.ts` default | `no-cache` — does not write |
| Old Context Providers (`Environment`/`Attribute`/`Subscription`/`Theme` list) | No options override → no-cache → does not write |
| `pages/contents/*` (content builder, detail, preview) | Reads via the old contexts → does not write (one `network-only` in `analytics-tracker-users`) |
| `pages/integrations/*`, admin, auth | no-cache → does not write |
| `SHARED_CACHE_QUERY_OPTIONS` callers (settings + segments/entity + facade + user-sessions) | cache-first → **writes** |
| Explicit `fetchPolicy: 'cache-and-network'` literals (`useGetSubscriptionUsageQuery`, three users/companies detail-content queries) | **writes** |
| `packages/hooks` internals (`use-content-count`, `use-tooltip-target-missing-sessions`, `analytics-tracker-users`) | **writes** |

`addTypename` is invisible to no-cache callers — flipping it globally has zero behavior change for the entire content-builder / contents / integrations / admin surface. The smoke-and-change surface coincides with the area v0.8.4 already refactored, plus three isolated wrappers.

## Decision

1. **Enable normalized cache.** Flip `apollo/cache/index.ts`'s `addTypename: false → true` and bump the `apollo3-cache-persist` storage key so the next deploy starts with an empty persisted cache (avoids shape-mismatch on restore).

2. **Add `typePolicies`** for fields that need custom merge semantics. The known cases:
   - `Query.bizUsers`, `Query.bizCompanies` — paginated list fields, use `relayStylePagination` (keyed by the relevant filter args so a different filter is a different cache slice).
   - Other entities default to `keyFields: ['id']` — Apollo's implicit behavior with `__typename + id` present, no explicit policy required.

3. **Adopt `update(cache, { data })` callbacks on mutations that affect lists.** This is the work block. Surface:
   - Settings mutations (events / environments / attributes / localizations / themes / api / members): create / delete / set-default / set-primary / invite / cancel / change-role / remove / transfer-owner — roughly 20 mutations.
   - Users/companies bulk operations (add to manual segment, remove from segment, delete from segment, save segment filter) — roughly 5 mutations.

   Pattern per mutation:
   - **Create** that enters a list → `cache.modify({ fields: { listXxx(existing = []) { return [...existing, newRef] } } })` after writing the new entity into the cache.
   - **Delete** → `cache.evict({ id: cache.identify({ __typename: 'XEntity', id }) })` followed by `cache.gc()`.
   - **Update** → Apollo merges automatically by id + typename when the mutation response includes both; no callback required.
   - **Bulk delete / remove** → loop the evict pattern; one final `cache.gc()`.

4. **Drop redundant manual `refetch()` calls** at sites whose mutation now self-propagates via cache. The grepped 59 is expected to drop to ~25 (the remainder covers cross-query / derived-state refreshes that the cache can't replace, e.g. quota usage after a plan change).

5. **Migrate users/companies shared list state to Apollo reactive variables.** `EntityDataTable`'s `useState({ query, pagination })` becomes a module-level `makeVar` per entity. Toolbar / row-actions / dialogs subscribe via `useReactiveVar` instead of receiving `setQuery` / `setCurrentConditions` / `refetch` props. This eliminates the prop-drill that previously coupled operation components to their parent's render tree.

6. **Retire `SHARED_CACHE_QUERY_OPTIONS`** at the call-site level. With cache normalization in place, the per-call-site opt-in stops being the right abstraction:
   - The settings list pages that previously relied on it now get refetch propagation through normalized cache + mutation callbacks instead.
   - The constant file (`apollo/options.ts`) stays as long as one or two truly per-call-site escape hatches remain (`useGetSubscriptionUsageQuery`'s `cache-and-network` is one such); but the `SHARED_CACHE_QUERY_OPTIONS` name and its `cache-first` value are removed.

   Net effect: each consumer either uses the global default (`no-cache`, for transient one-shot reads) or names its own `fetchPolicy` explicitly when it needs cache participation. The "spread this constant" pattern goes away.

## Consequences

**Good**

- Mutation → list propagation runs through Apollo's broadcast, not through manually written `await refetch()` chains. The 59-then-25 drop in `refetch()` calls is the visible measurement.
- Same-entity reads across different pages stay in sync automatically. The classic example: rename an attribute in settings, and any content builder / users detail row that shows the same attribute name updates without a navigation round-trip.
- Users/companies' operation components stop knowing about their parent's state shape. The prop-drilled `setQuery` / `setCurrentConditions` / `refetch` chains disappear; each operation either subscribes to a `makeVar` or invokes a mutation that talks to the cache.
- Future entity list pages start from a working baseline (Apollo idiom) instead of a half-supported convention.

**Bad**

- Every list-affecting mutation now carries a small `update(cache)` block. A mutation written without one fails silently (the server change is correct, but the local cache doesn't reflect it). The codebase needs a review-time habit of asking "what does this mutation invalidate?" for any new mutation.
- Cache normalization couples queries that select overlapping field sets. If `getAttribute` returns `{id, displayName, description}` and `listAttributes` returns `{id, displayName, codeName}`, the cache stores all four fields under one `Attribute:{id}` entry. A later read of `listAttributes` sees `description` populated; this is harmless when the values agree but can surface bugs where one query returns a stale or partial entity. Apollo emits dev-mode console warnings for merge conflicts.
- The persisted localStorage cache is invalidated on the next deploy (intentional, via the key bump). Existing users see a brief load-from-network on first visit instead of restored cache. Acceptable; the alternative (in-place migration) is fragile.

**Smoke surface**

- All call sites currently using `SHARED_CACHE_QUERY_OPTIONS` or explicit `cache-and-network` / `network-only` (the table in the Context section above).
- Three isolated wrappers: `use-content-count`, `use-tooltip-target-missing-sessions`, `analytics-tracker-users`.
- `me` cache eviction sites (use-logout, two-factor) — `me` is a root field, eviction behavior unchanged, but worth a manual smoke after the flip.

`pages/contents/*` content builder, `pages/integrations/*`, admin: **not in smoke surface** because nothing in those areas writes to the cache today. addTypename is invisible to no-cache queries.

## Alternatives Considered

### A. Keep ADR 0005 status quo

Continue with `SHARED_CACHE_QUERY_OPTIONS` cache-first opt-in + manual `refetch()` on every mutation.

**Rejected because:** the count is now 59 (over 0005's stated threshold of ~50) and the v0.8.4 refactor focused on exactly the file set most affected. Doing this work later means a second pass over the same files — explicitly what we want to avoid.

### B. Per-document `__typename` selections, keep global `addTypename: false`

Add `__typename` manually to the GraphQL document selection sets for the queries we want normalized. Leave others alone.

**Rejected because:** the same entity (e.g. `Attribute`) appears in both typed and untyped queries → cache holds both normalized refs and raw objects for the same conceptual entity → `cache.identify` finds one and not the other → `update` callbacks miss half the writes. The inconsistent state is harder to reason about than the global flip.

### C. Reactive vars for users/companies only, no cache changes

Migrate users/companies shared state to `makeVar` without touching `addTypename` or writing mutation callbacks.

**Rejected because:** the prop-drill removal is real but doesn't kill any of the 59 refetch calls — they stay. The work block is much smaller (~6 files) but the major value of going Apollo-native (mutation auto-propagation) isn't realized.

### D. Defer to v0.9 or later

Delay this until a future version where it can have a dedicated sprint.

**Rejected because:** the refactor concentration in v0.8.4 won't repeat. Postponing means accepting that the same area gets touched again with no functional progress in between.

## Triggers to Revisit

- A query's response shape grows to the point that the cache merge starts dropping fields silently (Apollo dev warnings indicate this). At that point, the affected query type needs an explicit `merge` policy added to `typePolicies`, or its fields need to be split into a fragment.
- The `update(cache)` callbacks become repetitive enough that an abstraction (helper functions, or per-domain cache utilities) is warranted. Right now the patterns are simple enough (one-liner evict, one-liner modify) that ad-hoc per-mutation callbacks are fine; if a typical mutation grows past ~10 lines of cache logic, factor out.
- A new app shell wants different cache semantics. As of this ADR there is one app (apps/web) — if a future admin / portal app joins, its cache config can stay independent (each app constructs its own Apollo client + cache).

## References

- `apps/web/src/apollo/cache/index.ts` — addTypename flip + persist key.
- `apps/web/src/apollo/type-policies/index.ts` — typePolicies for normalized cache + paginated lists.
- `packages/hooks/src/hooks/*.ts` — mutation wrappers carrying their `update` callbacks.
- ADR 0005 — preserved as `Superseded by 0006`.
