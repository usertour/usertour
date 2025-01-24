import { TypePolicies } from "@apollo/client";
import { initialUser, initialI18n } from "@/apollo/state";

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
