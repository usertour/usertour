import './index.css';

import { getApolloClient } from '@/apollo';
import App from '@/app/index';
import { AppProvider } from '@/contexts/app-context';
import { ApolloProvider } from '@apollo/client';
import { Toaster } from '@usertour-packages/use-toast';
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
      <PostHogProvider apiKey={posthogKey} options={options}>
        <ApolloProvider client={client}>
          <HelmetProvider>
            <AppProvider>
              <App />
              <Toaster />
            </AppProvider>
          </HelmetProvider>
        </ApolloProvider>
      </PostHogProvider>
    </React.StrictMode>
  );

  rootElement.render(AppBundle);
}

bootstrap();
