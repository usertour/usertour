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
import './i18n/config';

const options = {
  api_host: posthogHost,
};

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
