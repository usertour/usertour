import { initialI18n, initialUser } from '@/apollo/state';
import { FieldPolicy, TypePolicies } from '@apollo/client';

// Shared shape for every infinite-scroll accumulator field.
//
//  - `after` present  → fetchMore: append incoming edges after existing
//  - `after` absent   → base fetch (initial load OR mutation
//                       `refetchQueries`): REPLACE with incoming.
//
// The replace-on-no-cursor semantic is deliberate. An earlier draft
// kept the larger of `existing` / `incoming` to defend against per-row
// components re-issuing the same `cache-and-network` query and
// overwriting the accumulator. That anti-pattern has been removed at
// the call sites (`ContentVersionAction` no longer holds redundant
// query refs), so the guard now only causes harm: when a restore /
// publish-then-edit mutation refetches `listContentVersions` and the
// new page-1 carries the just-created version, the "keep larger"
// branch drops the new edge and the user can't see their version
// until a hard reload.
//
// No dedup: the server uses `@devoxa/prisma-relay-cursor-connection`
// uniformly across all four fields, and the queries are ordered by
// immutable `createdAt`. Strict-exclusive cursor semantics mean
// consecutive pages can't carry overlapping edges. An earlier draft
// of this helper carried a cursor-keyed `dedupBy` defensively (copied
// from a comment in the activity-feed loader that warned about
// "mid-cursor row modification"), but with `createdAt` ordering on
// immutable rows there's nothing to modify mid-cursor. If the server
// ever does emit a duplicate, surface it as a server bug rather than
// silently dropping it here.
//
// IMPORTANT — single-accumulator-consumer invariant. The `no-after →
// REPLACE` branch means any consumer firing the base query (no
// `after`) will overwrite the accumulator with just page 1. Today
// that's not a problem because the only callers that issue base
// queries are mutations' `refetchQueries` (which is the *intended*
// trigger for the replace) plus consumers that mount once and don't
// re-fire the base. Don't add a second cache-and-network consumer
// that periodically re-fires the base on the same cell — it would
// silently nuke an in-progress accumulator built by the fetchMore
// caller. If a new consumer needs the same field, give it a
// `fetchPolicy: 'cache-only'` reader.
type ConnectionShape<TEdge = unknown> = {
  edges: TEdge[];
  [k: string]: unknown;
};

const accumulatorMerge = <TEdge>(keyArgs: string[]): FieldPolicy<ConnectionShape<TEdge>> => ({
  keyArgs,
  merge(existing, incoming, { args }) {
    if (!existing) {
      return incoming;
    }
    const after = (args as { after?: string } | null)?.after;
    if (!after) {
      return incoming;
    }
    return {
      ...incoming,
      edges: [...(existing.edges ?? []), ...(incoming.edges ?? [])],
    };
  },
});

// `queryBizUser` / `queryBizCompany` / `queryBizSession` are
// deliberately absent here — they're driven by `useCursorPagination`'s
// page-replace semantics (each page click swaps the visible slice;
// cache slot is keyed by the full variable set including the cursor).
// Adding an accumulator merge would render previous pages on top of
// the current one. The Events variants (queryBizUserEvents /
// queryBizCompanyEvents) are different operations — they back the
// activity feed and DO want accumulation.
export const TypePolicy: TypePolicies = {
  Query: {
    fields: {
      localUser: {
        read(existing) {
          if (!existing) {
            return initialUser();
          }
          return existing;
        },
        merge(existing, incoming) {
          return { ...existing, ...incoming };
        },
      },

      i18n: {
        read(existing) {
          if (!existing) {
            return initialI18n();
          }
          return existing;
        },
        merge(existing, incoming) {
          return { ...existing, ...incoming };
        },
      },

      // Infinite-scroll pagination, accumulator semantics.
      //
      // `keyArgs` lists **top-level GraphQL field arguments**, not
      // properties nested inside them. For the activity-feed queries,
      // `environmentId` / `userId` / `companyId` live INSIDE the
      // `query` arg (`BizEventQuery!`), so keying by `['query',
      // 'orderBy']` is what distinguishes per-user / per-company /
      // per-filter cache slots. Listing nested names directly would
      // make Apollo fall back to "all variables" keyArgs and each
      // `fetchMore` (with a different `after`) would land in its own
      // slot — the watch query would never see appended pages.
      listContentVersions: accumulatorMerge(['contentId']),
      listContentPublishRecords: accumulatorMerge(['contentId', 'environmentId']),
      queryContent: accumulatorMerge(['query', 'orderBy']),
      queryBizUserEvents: accumulatorMerge(['query', 'orderBy']),
      queryBizCompanyEvents: accumulatorMerge(['query', 'orderBy']),
      // Audit log is its own page (settings tab); filters/sort live in the
      // top-level `query`/`orderBy` args, `projectId` scopes the cache cell.
      auditLogs: accumulatorMerge(['projectId', 'query', 'orderBy']),
    },
  },
};
