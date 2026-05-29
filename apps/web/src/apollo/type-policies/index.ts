import { initialI18n, initialUser } from '@/apollo/state';
import { TypePolicies } from '@apollo/client';
import { relayStylePagination } from '@apollo/client/utilities';

export const TypePolicy: TypePolicies = {
  Query: {
    fields: {
      // Relay-style cursor pagination for the four paginated list
      // queries. `query` and `orderBy` are part of the cache key so
      // different filters / sorts get their own slice; pagination args
      // (`first` / `last` / `after` / `before`) are absorbed into the
      // accumulated edges array by relayStylePagination itself.
      queryBizUser: relayStylePagination(['query', 'orderBy']),
      queryBizCompany: relayStylePagination(['query', 'orderBy']),
      queryBizUserEvents: relayStylePagination(['query', 'orderBy']),
      queryBizCompanyEvents: relayStylePagination(['query', 'orderBy']),

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
