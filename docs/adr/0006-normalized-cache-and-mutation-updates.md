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
| `SHARED_CACHE_QUERY_OPTIONS` callers (settings + segments/entity + facade + user-sessions + detail-content lookups) | cache-and-network → **writes** |
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

6. **Keep `SHARED_CACHE_QUERY_OPTIONS`, repurposed as `cache-and-network`.** The constant survives but its value changes from `cache-first` to `cache-and-network` so that:
   - mutation `update(cache)` / `refetchQueries` callbacks broadcast to every observer of the same slice (this is the precondition for `addTypename: true` to deliver value);
   - revisits paint cached data immediately AND fire a network request in parallel, so another project member's edits become visible on the next mount without a hard reload — settings is shared across an OWNER + multiple admins + a viewer, not a single-user surface as the earlier drafts assumed.

   Each consumer either uses the global default (`no-cache`, for transient one-shot reads) or spreads `SHARED_CACHE_QUERY_OPTIONS` to participate in the shared cache slice. The "spread this constant" pattern stays, but the previously-needed `fetchPolicy: 'cache-and-network'` literal overrides on detail-content / subscription-usage call sites collapse back into the same constant — there's no longer a distinction between "shared cache" and "cross-tab fresh" opt-ins, because the constant covers both.

## Consequences

**Good**

- Mutation → list propagation runs through Apollo's broadcast, not through manually written `await refetch()` chains. The 59-then-25 drop in `refetch()` calls is the visible measurement.
- Same-entity reads across different pages stay in sync automatically. The classic example: rename an attribute in settings, and any content builder / users detail row that shows the same attribute name updates without a navigation round-trip.
- Users/companies' operation components stop knowing about their parent's state shape. The prop-drilled `setQuery` / `setCurrentConditions` / `refetch` chains disappear; each operation either subscribes to a `makeVar` or invokes a mutation that talks to the cache.
- Future entity list pages start from a working baseline (Apollo idiom) instead of a half-supported convention.

**Bad**

- Every list-affecting mutation now carries a small `update(cache)` block. A mutation written without one fails silently (the server change is correct, but the local cache doesn't reflect it). The codebase needs a review-time habit of asking "what does this mutation invalidate?" for any new mutation.
- **`update*` mutations must return the fields the cache needs to merge.** Apollo's auto-merge by `__typename + id` writes whatever the mutation response carries; if the response only selects `{ id }` the cached entity keeps its stale fields. `updateAttribute` / `updateEvent` / `updateLocalization` / `updateTheme` mirror their list query's selection set for this reason.
- Cache normalization couples queries that select overlapping field sets. If `getAttribute` returns `{id, displayName, description}` and `listAttributes` returns `{id, displayName, codeName}`, the cache stores all four fields under one `Attribute:{id}` entry. A later read of `listAttributes` sees `description` populated; this is harmless when the values agree but can surface bugs where one query returns a stale or partial entity. Apollo emits dev-mode console warnings for merge conflicts.
- **One network request per mount of each consuming page.** Acceptable for settings + users/companies + the facade — none mount frequently. Settings sub-pages and the facade in particular only mount on explicit navigation, so the per-mount cost is small.
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

- A high-frequency mount target needs cache participation. Today's consumers (settings list pages, facade hooks, segments entity + a few detail-page lookups) all have low mount frequency, so one network per mount is cheap. If a frequently-remounted page joins this set, weigh that page's freshness need against `cache-first` overrides per call site (with the caveat that cross-member visibility regresses).
- A query's response shape grows to the point that the cache merge starts dropping fields silently (Apollo dev warnings indicate this). At that point, the affected query type needs an explicit `merge` policy added to `typePolicies`, or its fields need to be split into a fragment imported into both list query and update mutation.
- The `update(cache)` callbacks become repetitive enough that an abstraction (helper functions, or per-domain cache utilities) is warranted. Right now the patterns are simple enough (one-liner evict, one-liner modify) that ad-hoc per-mutation callbacks are fine; if a typical mutation grows past ~10 lines of cache logic, factor out.
- A new app shell wants different cache semantics. As of this ADR there is one app (apps/web) — if a future admin / portal app joins, its cache config can stay independent (each app constructs its own Apollo client + cache).

## References

- `apps/web/src/apollo/cache/index.ts` — addTypename flip + persist key.
- `apps/web/src/apollo/type-policies/index.ts` — typePolicies for normalized cache + paginated lists.
- `packages/hooks/src/hooks/*.ts` — mutation wrappers carrying their `update` callbacks.
- ADR 0005 — preserved as `Superseded by 0006`.
