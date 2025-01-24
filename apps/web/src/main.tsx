import "./index.css";

import { getApolloClient } from "@/apollo";
import App from "@/app/index";
import ReactDOM from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { ApolloProvider } from "@apollo/client";
import createI18n from "./i18n/i18n";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@usertour-ui/toaster";
import React from "react";
import { AppProvider } from "@/contexts/app-context";
import { PostHogProvider } from "posthog-js/react";

const options = {
  api_host: import.meta.env.VITE_APP_PUBLIC_POSTHOG_HOST,
};

async function bootstrap() {
  // get the apollo client store
  const client = await getApolloClient();
  // get the inital language from the store
  const i18n = await createI18n(client);

  const rootElement = ReactDOM.createRoot(
    document.getElementById("root") as HTMLElement
  );

  const AppBundle = (
    <React.StrictMode>
      <PostHogProvider
        apiKey={import.meta.env.VITE_APP_PUBLIC_POSTHOG_KEY}
        options={options}
      >
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
