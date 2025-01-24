/**
 * This file setup the connection to a graphql server
 */
import { getAuthToken } from "@usertour-ui/shared-utils";
import { setContext } from "@apollo/client/link/context";
import { createHttpLink } from "@apollo/client";

const authLink = setContext((_, { headers }) => {
  // get the authentication token from local storage if it exists
  const token = getAuthToken();
  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      Authorization: token ? `Bearer ${token}` : "",
    },
  };
});

const uri = import.meta.env.VITE_GRAPHQL_HTTP_URI || "/graphql";

const httpLink = createHttpLink({
  uri,
});

export const serverLink = authLink.concat(httpLink);
