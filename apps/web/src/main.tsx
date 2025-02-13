import './index.css';

import { getApolloClient } from '@/apollo';
import App from '@/app/index';
import { AppProvider } from '@/contexts/app-context';
import { ApolloProvider } from '@apollo/client';
import { Toaster } from '@usertour-ui/toaster';
import { PostHogProvider } from 'posthog-js/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { I18nextProvider } from 'react-i18next';
import createI18n from './i18n/i18n';
import { posthogHost, posthogKey } from './utils/env';

const options = {
  api_host: posthogHost,
};

async function bootstrap() {
  // get the apollo client store
  const client = await getApolloClient();
  // get the inital language from the store
  const i18n = await createI18n(client);

  const rootElement = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

  const AppBundle = (
    <React.StrictMode>
      <PostHogProvider apiKey={posthogKey} options={options}>
        <ApolloProvider client={client}>
          <I18nextProvider i18n={i18n}>
            <HelmetProvider>
              <AppProvider>
                <App />
                <Toaster />
              </AppProvider>
            </HelmetProvider>
          </I18nextProvider>
        </ApolloProvider>
      </PostHogProvider>
    </React.StrictMode>
  );

  rootElement.render(AppBundle);
}

bootstrap();
