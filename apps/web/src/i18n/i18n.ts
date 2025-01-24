import { getLanguage } from "@/apollo/operations/client/queries";
import i18next, { InitOptions } from "i18next";
import { initReactI18next } from "react-i18next";
import { ApolloClient } from "@apollo/client";
import * as resources from "./locales";

async function createI18n(apolloClient: ApolloClient<any>) {
  // get the initial language from the apollo store
  // const i18 = await apolloClient.readQuery({ query: getLanguage });

  const options: InitOptions = {
    resources: resources.default,

    debug: false,
    fallbackLng: "en",
    // lng: i18.i18n.lng,
    lng: "en",
    keySeparator: false,
    ns: ["translation"],
    defaultNS: "translation",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  };

  await i18next.use(initReactI18next).init(options);

  return i18next;
}

export default createI18n;
