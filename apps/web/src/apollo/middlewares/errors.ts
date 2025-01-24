/* eslint-disable no-console */
import { onError } from "@apollo/client/link/error";

export const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.map(({ message, extensions }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${extensions?.code}`
      );
      return null;
    });

    const errors = graphQLErrors[0];
    switch (errors.extensions?.code) {
      case "UNAUTHENTICATED":
        if (!window.location.pathname.startsWith("/auth")) {
          window.location.href = "/auth/signin";
        }
        break;
      case "ANOTHER_ERROR_CODE":
        break;
      default:
    }
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});
