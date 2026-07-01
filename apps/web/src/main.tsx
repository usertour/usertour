import './index.css';

import { getApolloClient } from '@/apollo';
import App from '@/app/index';
import { AppProvider } from '@/contexts/app-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { ThemedToaster } from '@/components/themed-toaster';
import { ApolloProvider } from '@apollo/client';
import type { CaptureResult } from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { posthogHost, posthogKey } from './utils/env';
import { reloadForStaleChunkOnce } from './utils/stale-chunk';
import './i18n/config';

// "ResizeObserver loop completed with undelivered notifications" is a benign
// browser notice, not a failure: when a ResizeObserver callback triggers a
// reflow that would re-fire it, the spec defers the remaining notifications to
// the next frame and emits this. It reaches us stack-less via window.onerror
// (no JS frame to fix) and any ResizeObserver — Radix popper, react-use's
// useMeasure, etc. — can surface it, so we drop it at the reporting boundary
// rather than chase a non-existent loop source.
const isBenignResizeObserverNotice = (event: CaptureResult): boolean => {
  if (event.event !== '$exception') {
    return false;
  }
  const exceptionList = event.properties?.$exception_list;
  if (!Array.isArray(exceptionList)) {
    return false;
  }
  return exceptionList.some(
    (exception) =>
      typeof exception?.value === 'string' && exception.value.includes('ResizeObserver loop'),
  );
};

const options = {
  api_host: posthogHost,
  // Auto-capture uncaught errors / unhandled rejections that escape React's
  // error boundaries; RouteErrorBoundary reports the ones it does catch.
  autocaptureExceptions: true,
  // Filter known-benign noise before it ships. Covers both autocaptured window
  // errors and manual captureException() calls.
  before_send: (event: CaptureResult | null): CaptureResult | null => {
    if (event && isBenignResizeObserverNotice(event)) {
      return null;
    }
    return event;
  },
};

// Vite fires this when a dynamic import's module preload fails — typically a
// chunk rotated out by a fresh deploy. Recover by reloading (guarded against
// loops) before the error reaches the router. preventDefault stops Vite's
// default throw.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadForStaleChunkOnce();
});

async function bootstrap() {
  // get the apollo client store
  const client = await getApolloClient();

  const rootElement = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

  const AppBundle = (
    <React.StrictMode>
      <ThemeProvider>
        <PostHogProvider apiKey={posthogKey} options={options}>
          <ApolloProvider client={client}>
            <HelmetProvider>
              <AppProvider>
                <App />
                <ThemedToaster />
              </AppProvider>
            </HelmetProvider>
          </ApolloProvider>
        </PostHogProvider>
      </ThemeProvider>
    </React.StrictMode>
  );

  rootElement.render(AppBundle);
}

bootstrap();
