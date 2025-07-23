import { apiUrl } from '@/utils/env';
import { createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
/**
 * This file setup the connection to a graphql server
 */
// import { getAuthToken } from '@usertour-packages/utils';

const authLink = setContext((_, { headers }) => {
  // get the authentication token from local storage if it exists
  // const token = getAuthToken();
  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      // Authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const httpLink = createHttpLink({
  uri: `${apiUrl}/graphql`,
});

export const serverLink = authLink.concat(httpLink);
