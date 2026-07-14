import { ReactNode, createContext, useContext, useMemo } from 'react';

import {
  DEFAULT_WIDGET_LOCALE,
  WidgetMessages,
  getWidgetMessages,
  resolveWidgetIntlLocale,
} from './messages';

export interface WidgetLocaleValue {
  /**
   * The locale as provided (for Intl formatting — 'fr-CA' should keep its
   * regional date format even though the dictionary reduces it to 'fr').
   * Defaults to 'en' when no provider is mounted, which keeps standalone
   * renders (admin previews, builders) on today's English chrome.
   */
  locale: string;
  messages: WidgetMessages;
}

const WidgetLocaleContext = createContext<WidgetLocaleValue>({
  locale: DEFAULT_WIDGET_LOCALE,
  messages: getWidgetMessages(undefined),
});

export interface WidgetLocaleProviderProps {
  /** User locale (BCP-47). Undefined or unknown values fall back to English. */
  locale: string | undefined;
  children: ReactNode;
}

export const WidgetLocaleProvider = (props: WidgetLocaleProviderProps) => {
  const { locale, children } = props;
  const value = useMemo<WidgetLocaleValue>(
    () => ({
      locale: resolveWidgetIntlLocale(locale),
      messages: getWidgetMessages(locale),
    }),
    [locale],
  );
  return <WidgetLocaleContext.Provider value={value}>{children}</WidgetLocaleContext.Provider>;
};

WidgetLocaleProvider.displayName = 'WidgetLocaleProvider';

export const useWidgetLocale = (): WidgetLocaleValue => useContext(WidgetLocaleContext);
