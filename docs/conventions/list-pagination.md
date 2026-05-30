# List pagination conventions

Three primitives serve three different UX shapes. Picking the right one
is a function of **where the list sits in the page**, not personal
preference — and the choice has runtime consequences (how server
requests fire, when the cursor resets, when the user expects more rows
to appear). This doc names the three, the contract each enforces, and
the anti-patterns we already paid to learn about.

## The decision

| Page layout | UX | Primitive |
|---|---|---|
| **The list IS the page** (or the whole tab / dialog) — contents grid, version history tab, sessions-not-found dialog | Sentinel-triggered infinite scroll | `typePolicy accumulatorMerge` + `react-infinite-scroll-hook` |
| **The list is one of several cards on a longer page** — user-detail "Sessions" card, company-detail "Members" card | Explicit "Load more" button | `useLoadMoreAccumulator` |
| **Table that needs jump-to-page** — users / companies management tables, analytics sessions table | Page-button cursor pagination ("Page 2 of 19") | `useCursorPagination` |

The principle: **infinite scroll is fine when the list owns the
viewport; on a detail page where the user might scroll past the list
to reach other content, infinite scroll fires fetches the user didn't
ask for, so Load More is the safer default.** Page buttons exist for
tables where users want jump-to-page and exact "page X of Y" feedback.

## 1. Infinite scroll (typePolicy + `react-infinite-scroll-hook`)

The cache layer owns the merge. Apollo's `fetchMore` writes incoming
edges into the same cache cell via the `accumulatorMerge` typePolicy
on the GraphQL field; the React side just renders whatever's in cache
and watches the sentinel ref.

```ts
// apps/web/src/apollo/type-policies/index.ts (already in place)
listContentVersions:   accumulatorMerge(['contentId']),
queryContent:          accumulatorMerge(['query', 'orderBy']),
queryBizUserEvents:    accumulatorMerge(['query', 'orderBy']),
queryBizCompanyEvents: accumulatorMerge(['query', 'orderBy']),
```

```tsx
// Consumer
const scrollRoot = useScrollRoot();
const [sentryRef, { rootRef }] = useInfiniteScroll({
  loading: loading || loadingMore,
  hasNextPage,
  onLoadMore: fetchNextPage,
  rootMargin: '0px 0px 100px 0px',
});
useEffect(() => { rootRef(scrollRoot); }, [rootRef, scrollRoot]);

return (
  <>
    {rows.map(renderRow)}
    {hasNextPage && <div ref={sentryRef} />}
  </>
);
```

### Contract

- **`keyArgs` lists top-level GraphQL field args, not nested properties**
  inside them. For activity-feed queries, `environmentId` / `userId`
  live inside the `query` arg, so the keyArgs is `['query', 'orderBy']`,
  not `['environmentId', 'userId']` (which would silently fall back
  to "all variables" keyArgs and each fetchMore writes to its own
  isolated cell).
- **Base refetch (no `after`) REPLACES the accumulator.** Mutations'
  `refetchQueries` send a page-1 fetch without `after`; the merge
  function returns `incoming`, so the cache resets to page 1
  including any new rows the mutation created (e.g. restored version).
- **`rootRef` MUST point at the actual scroll container** that clips
  the list. With `null` (the default), the IntersectionObserver
  triggers against the window viewport; for a list inside an
  `overflow-y-auto` parent, the sentinel reads as "in viewport" long
  after the user has scrolled past it inside the inner container.
  `ScrollRootProvider` is the standard wiring.
- **No `dedupBy`.** The server uses
  `@devoxa/prisma-relay-cursor-connection` uniformly and the queries
  order by immutable `createdAt`; strict-exclusive cursors mean
  consecutive pages can't carry overlapping edges. If a duplicate
  shows up, surface it as a server bug rather than swallow it.

## 2. Load More button (`useLoadMoreAccumulator`)

The hook owns the accumulator buffer + the in-flight flag. The caller
owns the cursor state (it's needed as input to the underlying Apollo
wrapper) and a `resetKey` derived from the query identity.

```tsx
const [afterCursor, setAfterCursor] = useState<string | undefined>();
const { contents, pageInfo, totalCount, loading, refetch } =
  useUserListQuery({
    query: { environmentId, companyId },
    pagination: { first: PAGE_SIZE, after: afterCursor },
  });

const { items, hasMore, loading: effectiveLoading, loadMore, refresh } =
  useLoadMoreAccumulator<BizUser>({
    pageItems: contents,
    pageInfo,
    pageTotalCount: totalCount,
    pageLoading: loading,
    pageRefetch: refetch,
    afterCursor,
    setAfterCursor,
    resetKey: `${environmentId}:${companyId}`,   // ← required
    getId: (user) => user.id,
  });
```

### Contract

- **`resetKey: string` is the dependency that wipes the accumulator.**
  When it changes (e.g. a route param flips to a different user /
  company), the hook runs `reset()` in a `useEffect`: clears items,
  clears `afterCursor`, and the underlying Apollo query auto-refetches
  because `after` just changed.
- **Build `resetKey` from every query identity the caller passes
  down.** `${environmentId}:${userId}` is right; just `userId` would
  fail to reset when the env switches.
- **The cursor stays caller-owned.** The hook can't own it because
  the caller has to feed it back into the underlying Apollo wrapper
  on each render.

## 3. Page-button cursor pagination (`useCursorPagination`)

Hook owns everything — `pagination` state, the cursor → relay-args
translation, the query-identity reset. Caller passes the entity's
Apollo wrapper (per ADR 0002) and a memoised `query` object.

```tsx
const query = useMemo(
  () => ({ environmentId, ...filters, segmentId }),
  [environmentId, filters, segmentId],
);

const {
  rows, totalCount, pageCount,
  pagination, setPagination,
  loading, refetch,
} = useCursorPagination({
  query,
  useListQuery: useUserListQuery,
  skip: !environmentId,
  options: SHARED_CACHE_QUERY_OPTIONS,
});

// Then bind `{ pagination, setPagination, pageCount }` to TanStack Table.
```

### Contract

- **`query` MUST be a stable reference across renders that don't
  change its content.** The hook compares
  `JSON.stringify({ query, orderBy })` to detect identity changes; a
  fresh object literal on every render is content-equal but the
  internal stringify still produces an equal key so reset doesn't
  fire unexpectedly — **however** missing the `useMemo` here is a
  performance smell (the stringify runs every render) so still wrap
  it.
- **Reset on query change is automatic.** Add a new field to `query`
  and the hook handles the reset; no `useEffect(() => setPagination(...))`
  in the caller. The "caller must remember to reset" anti-pattern
  that bit `useBizListCursor` is gone by construction.
- **Pagination state is hook-owned, exposed back via
  `{ pagination, setPagination }`** for TanStack Table binding.
  Don't reintroduce a `useState(DEFAULT_PAGINATION)` in the caller.

## Anti-patterns

```tsx
// ❌ Don't write a hand-rolled `updateQuery` for an accumulator field.
//    The typePolicy owns the merge — `refetchQueries` would otherwise
//    overwrite the accumulator with page 1 silently.
await fetchMore({
  variables: { ...vars, after: endCursor },
  updateQuery: (prev, { fetchMoreResult }) => ({...}),  // ← redundant
});

// ❌ Don't sentinel-paginate a list that sits inside a longer
//    scrollable page. The user scrolling past it to reach other
//    content fires fetches they didn't intend.
<div>
  <SessionsCard>
    {sessions.map(renderRow)}
    <div ref={sentryRef} />   {/* fires on incidental scroll-past */}
  </SessionsCard>
  <UserAttributesCard />
</div>

// ❌ Don't expose pagination state in the page component when using
//    `useCursorPagination`. The hook owns it.
const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
useEffect(() => {
  if (!dateRange) return;
  setPagination((p) => ({ ...p, pageIndex: 0 }));
}, [dateRange]);   // ← bug class the hook eliminates

// ❌ Don't put nested object fields in typePolicy `keyArgs`. They have
//    to be top-level field arguments. `environmentId` / `userId` live
//    INSIDE the `query` arg here, so the right keyArgs is `['query']`,
//    not `['environmentId', 'userId']`.
queryBizUserEvents: accumulatorMerge(['environmentId', 'userId']),
```

## When the choice isn't obvious

If you're not sure which one to reach for:

- **Will the user scroll PAST this list to reach other content on the
  same page?** Yes → Load More button. No → infinite scroll is fine.
- **Do users expect "Page X of Y" and jump-to-page?** Yes →
  `useCursorPagination`. No → one of the accumulator patterns.
- **Is this an admin table with filters + sorting?** Almost always
  `useCursorPagination`.

## Existing utilities

| Utility | Path |
|---|---|
| `useCursorPagination` (page-button + cursor) | `apps/web/src/hooks/use-cursor-pagination.ts` |
| `useLoadMoreAccumulator` (Load More button) | `apps/web/src/hooks/use-load-more-accumulator.ts` |
| `accumulatorMerge` (typePolicy) | `apps/web/src/apollo/type-policies/index.ts` |
| `react-infinite-scroll-hook` consumer + `ScrollRootProvider` examples | `version-history-list.tsx`, `list/data-table.tsx`, `tooltip-target-missing-dialog.tsx` |
