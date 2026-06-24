import './index.css';

import { getApolloClient } from '@/apollo';
import App from '@/app/index';
import { AppProvider } from '@/contexts/app-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { ThemedToaster } from '@/components/themed-toaster';
import { ApolloProvider } from '@apollo/client';
import { PostHogProvider } from 'posthog-js/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { posthogHost, posthogKey } from './utils/env';
import { reloadForStaleChunkOnce } from './utils/stale-chunk';
import './i18n/config';

const options = {
  api_host: posthogHost,
  // Auto-capture uncaught errors / unhandled rejections that escape React's
  // error boundaries; RouteErrorBoundary reports the ones it does catch.
  autocaptureExceptions: true,
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
