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
    },
  },
};
