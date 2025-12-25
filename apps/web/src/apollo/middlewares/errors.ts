/* eslint-disable no-console */
import { Observable } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

import { apiUrl } from '@/utils/env';

let isRefreshing = false;
let pendingRequests: (() => void)[] = [];

/**
 * Attempt to refresh the access token using the refresh token
 * @returns Promise<boolean> - true if refresh succeeded, false otherwise
 */
const refreshToken = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Error link handles authentication errors and attempts to refresh tokens
 * Uses @apollo/client/link/error as recommended by Apollo
 */
export const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    const error = graphQLErrors[0];

    if (error.extensions?.code === 'E0011') {
      // Token expired - attempt to refresh
      if (window.location.pathname.startsWith('/auth')) {
        // Already on auth page, don't retry
        return;
      }

      if (!isRefreshing) {
        isRefreshing = true;

        return new Observable((observer) => {
          refreshToken()
            .then((success) => {
              isRefreshing = false;

              if (success) {
                // Retry all pending requests
                for (const callback of pendingRequests) {
                  callback();
                }
                pendingRequests = [];
                // Retry current request
                forward(operation).subscribe(observer);
              } else {
                // Refresh failed, redirect to sign in
                pendingRequests = [];
                window.location.href = '/auth/signin';
              }
            })
            .catch(() => {
              isRefreshing = false;
              pendingRequests = [];
              window.location.href = '/auth/signin';
            });
        });
      }

      // Another refresh is in progress, queue this request
      return new Observable((observer) => {
        pendingRequests.push(() => {
          forward(operation).subscribe(observer);
        });
      });
    }
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});
