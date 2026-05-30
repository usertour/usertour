import { initialI18n, initialUser } from '@/apollo/state';
import { TypePolicies } from '@apollo/client';

// No `relayStylePagination` for the queryBizUser / queryBizCompany /
// queryBizUserEvents / queryBizCompanyEvents fields. `relayStylePagination`
// accumulates `edges` across requests with the same keyArgs, which
// clashes with `useBizListCursor`'s page-replace semantics — if those
// list queries ever opt into cache participation, an accumulating
// merge would render previous pages on top of the current one. With
// the default behavior (Apollo treats each unique-variables call as
// its own cache slot), cursor-based page replacement works correctly
// when those queries do opt in. Add back only if rendering moves to
// infinite-scroll accumulation.
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

      // `listContentVersions` is rendered with infinite-scroll accumulation
      // (sentinel-driven `fetchMore`) AND consumed by per-row components
      // (`ContentVersionAction`) that each re-invoke the same query under
      // `cache-and-network`. Without a merge policy, every per-row mount's
      // response — which is just page 1 (no `after`) — overwrites the
      // accumulated cache and resets the list, which lets the sentinel
      // re-enter the viewport, fires `fetchMore` again, and runs forever.
      //
      // The merge keeps the *larger* of `existing` / `incoming` when the
      // call has no cursor (base refetch), so a single-page refetch
      // can't shrink an accumulated multi-page result. When the call
      // *does* have an `after`, it's a `fetchMore` and we append.
      listContentVersions: {
        keyArgs: ['contentId'],
        merge(existing, incoming, { args }) {
          if (!existing) {
            return incoming;
          }
          const after = args?.after as string | undefined;
          const existingEdges = existing?.edges ?? [];
          const incomingEdges = incoming?.edges ?? [];
          if (after) {
            return {
              ...incoming,
              edges: [...existingEdges, ...incomingEdges],
            };
          }
          if (existingEdges.length > incomingEdges.length) {
            return existing;
          }
          return incoming;
        },
      },
    },
  },
};
