# 0005: Apollo cache strategy — `no-cache` default + `SHARED_CACHE_QUERY_OPTIONS` opt-in

- **Date:** 2026-05-29
- **Status:** Superseded by [0006](./0006-normalized-cache-and-mutation-updates.md)

## Context

`apps/web/src/apollo/index.ts` sets the app-wide Apollo defaults to:

```ts
const defaultOptions: DefaultOptions = {
  watchQuery: { fetchPolicy: 'no-cache', errorPolicy: 'all' },
  query: { fetchPolicy: 'no-cache', errorPolicy: 'all' },
};
```

And `apps/web/src/apollo/cache/index.ts` constructs `InMemoryCache` with `addTypename: false`. Both are deliberately conservative: they avoid the normalized-cache footguns (writing wrong `update` callbacks, accidental cross-query merges) at the cost of giving up most of Apollo's reactive sharing.

Under `no-cache`:

- `useQuery` responses go straight to the call site's local state; nothing is written to InMemoryCache.
- Two `useQuery` calls with the same query + variables create two independent `ObservableQuery` instances. `refetch()` on one updates only itself — the other never hears about it.
- Mutations also don't write to the cache. List refresh after a mutation must be triggered explicitly by the caller.

This bit us when settings pages migrated off React Context wrappers (PR 5211016e): list components and their per-row action components each called the same `useXxxQuery` wrapper, and the row-actions never picked up the list's refetch. The same pattern showed up later in the AppContext facade — `useCurrentUser` composed four times via `useUserProjects` / `useActiveProject` / `useCapabilities` generated four `me` observables, with only one exposed `refetch` reaching the others.

We need a way for sibling / nested consumers of the same query to share a single source of truth, **without** flipping the app-wide default and dragging every Apollo consumer into a new contract.

## Decision

Two pieces:

1. **App-wide default stays `no-cache`** with `addTypename: false`. Existing call sites that opted into "no auto-cache" behavior are unchanged.

2. **`SHARED_CACHE_QUERY_OPTIONS`** (`apps/web/src/apollo/options.ts`) is the documented opt-in for **per-call-site cache participation**:

   ```ts
   export const SHARED_CACHE_QUERY_OPTIONS: QueryHookOptions = {
     fetchPolicy: 'cache-first',
   };
   ```

   Call sites spread it into the wrapper options:

   ```ts
   useListEventsQuery(projectId, SHARED_CACHE_QUERY_OPTIONS);
   useListAttributesQuery(projectId, bizType, {
     ...SHARED_CACHE_QUERY_OPTIONS,
     skip: !projectId,
   });
   ```

   Behavior:
   - First observer with a given query + variables fires one network request and writes the response to InMemoryCache.
   - Subsequent observers with the same query + variables read from cache without firing additional network requests.
   - `refetch()` from any observer hits the network, writes the cache, and `broadcastWatches()` notifies every subscriber of that cache slice — both list and row-actions update from one refetch.
   - Apollo's in-flight dedup still applies when multiple observers mount in the same render commit (e.g. the facade case).

3. **Mutation refresh remains explicit `refetch()`** at the call site. We do **not** use mutation `update(cache)` callbacks for list updates — that requires `addTypename: true` and normalized cache, which is out of scope (see ADR 0005's "Triggers to revisit" below for the conditions under which we'd reopen).

### When to add `SHARED_CACHE_QUERY_OPTIONS` at a call site

- Multiple `useXxxQuery(...)` calls with the **same query + variables** mount on the same page tree, **and**
- a mutation on one consumer should refresh the others (delete on row-actions should remove the row from the list).

The opt-in is per-call-site: every consumer that needs to participate in the shared cache slice must spread it. Missing it on one site silently degrades that observer to no-cache (independent local state).

### When **not** to add it

- The query is genuinely single-consumer in its page tree — no sibling, no nested component reads the same data.
- The data is sensitive to cross-tab / cross-device changes and stale cache is unacceptable. In that case opt that specific call site into `fetchPolicy: 'cache-and-network'` directly, not `SHARED_CACHE_QUERY_OPTIONS` (which intentionally avoids network on revisit).
- The query is meant to be one-shot fresh on each invocation (some admin / debug surfaces). Leave it on the global `no-cache` default.

### Wrappers in `@usertour/hooks` accept `QueryHookOptions`

All list-style wrappers in `@usertour/hooks` take an optional `options?: QueryHookOptions` second parameter so call sites can pass `SHARED_CACHE_QUERY_OPTIONS` (or any other override) without modifying the wrapper. Existing fixed options inside the wrapper (`notifyOnNetworkStatusChange`, `skip`) come after `...options` only when they should be unoverridable; otherwise spread `options` last so the caller wins.

## Consequences

**Good**

- One named constant + `fetchPolicy: 'cache-first'` solves the "two consumers, one refetch" class of bug without flipping the global default or restructuring the cache config.
- Apollo's broadcast does the work — no React-state mirroring (lifting to parent + prop-drilling refetch) for problems Apollo already solves.
- Network requests per page visit drop from `1 + N rows` (cache-and-network, sequential mount) to `1` (cache-first, first observer fetches, rest hit cache).
- Revisit cost on already-cached settings pages drops to `0` network requests until a mutation triggers refetch.

**Bad**

- **Revisits read stale cache first.** No background refresh. Acceptable for data only mutated by user actions on the same page (settings lists). Not acceptable for cross-tab / cross-device dependent data — those call sites must override to `cache-and-network`.
- **Silent regression on omission.** If a future contributor adds a new consumer of the same query+vars without spreading `SHARED_CACHE_QUERY_OPTIONS`, that consumer silently runs on `no-cache` and stops participating. TypeScript cannot enforce this; the failure mode is "delete on row-actions doesn't refresh the list".
- The codebase still uses Apollo half-idiomatically: `addTypename: false` means we can't use `update(cache, { data })` mutation callbacks or `cache.identify()` / ref semantics. All list updates remain manual `refetch()`.

## Alternatives Considered

### A. Lift to single owner + prop-drill `refetch`

Have the list page own the single `useQuery` and pass `refetch` to row-actions / dialogs as a prop. This is the React-textbook "lift state to common ancestor" answer and is what `users/companies` already does (`EntityDataTable` owns `useBizListCursor`; operations take `refetch` via props).

**Rejected because:** Apollo Client already provides a normalized cache + reactive broadcast specifically for this case. Recreating it via prop-drilling reimplements `broadcastWatches` in React state. The arguments in favor — "TS prop enforces dependency", "no implicit cache contract" — are real but minor compared to giving up the framework idiom. We also pay a per-component cost: every intermediate component has to thread `refetch` through, and every child interface grows a `refetch` prop. The lift is the right pattern when the framework doesn't give you a sharing primitive; here, it does.

A v0.8.4 PR briefly migrated settings list+row-actions to the lift pattern (commits 5211016e and the post-review fix-up). It was reverted in 2d238125 in favor of this ADR.

### B. `fetchPolicy: 'cache-and-network'`

Same `SHARED_CACHE_QUERY_OPTIONS` constant, but with `cache-and-network` instead of `cache-first`. Every observer mount fires a network request **in addition to** reading the cache, so revisits always show fresh data.

**Rejected because:** the N+1 mount cost (one network request per row-actions instance, because they mount sequentially after the list's response arrives) is significantly worse than the revisit-stale tradeoff of `cache-first`. The settings data domain doesn't have a freshness pressure that justifies the cost. We instead document `cache-and-network` as the per-call-site opt-out for the rare consumer that does need always-fresh data.

(The original `SHARED_CACHE_QUERY_OPTIONS` shipped as `cache-and-network` in commit ea2793dd; this ADR records the switch to `cache-first` in 2d238125.)

### C. Flip `addTypename: true` and use `update(cache)` callbacks

The full Apollo idiom: turn on normalized cache, write mutation `update` callbacks that modify the cache directly (`cache.modify`, `cache.evict`, `cache.identify`), and eliminate most manual `refetch()` calls.

**Rejected (for now) because:** this is a meaningful codebase-wide refactor. Every mutation needs a correct `update` callback; every list query result needs `__typename` in its selection set or it's not normalized at all; cache `update` functions are notoriously easy to get wrong (silent bugs where the list updates locally but the cache stays stale). The current `no-cache` + manual `refetch()` pattern is verbose but obvious. We may revisit when the operational cost of manual refetches outweighs the migration cost — see "Triggers to revisit".

### D. Flip the app-wide default to `cache-first`

Instead of opting in per call site, change `apps/web/src/apollo/index.ts`'s default to `cache-first`.

**Rejected because:** that's a behavior change for every existing Apollo consumer, not just the ones that opted in. Many existing call sites are written assuming `no-cache` semantics (e.g. always-fresh detail page queries). Auditing every consumer to confirm `cache-first` is safe is a much bigger scope than a per-call-site opt-in. The opt-in constant is a deliberate marker: "this call site has been considered and wants to participate in the shared cache".

## Triggers to Revisit

Reopen this decision if any of the following holds:

- **Cross-tab / cross-device freshness becomes a recurring UX bug.** If users report stale settings data after edits from another tab often enough that per-call-site `cache-and-network` overrides become widespread, consider promoting `cache-and-network` to the default for `SHARED_CACHE_QUERY_OPTIONS` and accepting the network cost.
- **Manual `refetch()` calls become a maintenance burden.** If the count of `await refetch()` calls scattered across mutations grows past ~50 and the "did this mutation refresh that list?" question takes more than a few seconds to answer per code review, the full Apollo idiom (C above) starts being worth the migration cost. At that point: flip `addTypename: true`, audit existing queries for typename safety, write `update(cache)` callbacks for the high-frequency mutations, and drop the `SHARED_CACHE_QUERY_OPTIONS` opt-in.
- **A new app (admin portal, internal tool) wants a different Apollo config.** If `@usertour/hooks` ends up consumed by an app with a different default `fetchPolicy`, the assumptions baked into `SHARED_CACHE_QUERY_OPTIONS` (counter-default opt-in) no longer hold and the constant needs to either move into apps/web only or be re-expressed at the wrapper level.

## References

- `apps/web/src/apollo/options.ts` — the `SHARED_CACHE_QUERY_OPTIONS` constant + JSDoc.
- `apps/web/src/apollo/index.ts` — the global `no-cache` default.
- `apps/web/src/apollo/cache/index.ts` — `addTypename: false` cache config.
- Commits: 5211016e (introduced the constant + first wave of opt-ins), ea2793dd (review fix-ups), 2d238125 (switched from `cache-and-network` to `cache-first` after the N+1 mount cost surfaced; reverted the lift workaround).
