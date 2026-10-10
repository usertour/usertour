import { Observable } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import type { GraphQLFormattedError } from 'graphql';
import posthog from 'posthog-js';
import { NOTIFIES_OWN_FAILURES } from '@usertour/hooks';
import { apiUrl } from '@/utils/env';
import { reportNetworkFailure } from '../network-errors';

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

// Every error the server raises on purpose carries a code from its catalogue
// (E0003 … E1046): validation, permission, not found, conflict, a limit. Those
// are outcomes a page or a mutation site presents to the user; the link stays
// out of it. E0000 is the server's "something it did not expect", and an
// error with no code never came through the catalogue at all — those are the
// ones to report.
const UNKNOWN_SERVER_ERROR = 'E0000';
const isExpectedCode = (code: unknown): boolean =>
  typeof code === 'string' && /^E\d{4}$/.test(code) && code !== UNKNOWN_SERVER_ERROR;

const report = (error: GraphQLFormattedError, operationName: string): void => {
  if (!posthog.__loaded) {
    return;
  }
  const code = error.extensions?.code;
  const captured = new Error(error.message);
  captured.name = typeof code === 'string' ? code : 'GraphQLError';
  posthog.captureException(captured, {
    operationName,
    graphqlPath: error.path?.join('.'),
    graphqlCode: code,
  });
};

/**
 * Error link: session handling, classification and reporting (ADR 0021 §4).
 * It never shows a query error itself — the query layer surfaces those with
 * context — and it hands network failures to the notifier through
 * reportNetworkFailure.
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
                // Refresh failed, redirect to log in
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

    if (error.extensions?.code === 'E0013') {
      // Triggered when this tab's React state still references a project the
      // current session no longer has access to — typically because another
      // tab logged in or registered as a different account (cookies are
      // shared across tabs, per-tab React state isn't). Navigate to root so
      // AppContext re-initialises from the current cookies and LandingRedirect
      // picks an environment the user actually has access to.
      if (window.location.pathname.startsWith('/auth')) {
        return;
      }
      window.location.href = '/';
      return;
    }

    for (const graphQLError of graphQLErrors) {
      if (!isExpectedCode(graphQLError.extensions?.code)) {
        report(graphQLError, operation.operationName);
      }
    }
    return;
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    // A watched query reports its own network failure (and knows whether it
    // was a poll); the link announces the rest: mutations, lazy queries.
    if (!operation.getContext()[NOTIFIES_OWN_FAILURES]) {
      reportNetworkFailure({ operationName: operation.operationName, error: networkError });
    }
  }
});
