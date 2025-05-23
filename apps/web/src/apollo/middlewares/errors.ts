/* eslint-disable no-console */
import { onError } from '@apollo/client/link/error';

export const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    const error = graphQLErrors[0];
    switch (error.extensions?.code) {
      case 'E0011':
        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth/signin';
        }
        break;
      case 'ANOTHER_ERROR_CODE':
        break;
      default:
    }
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});
