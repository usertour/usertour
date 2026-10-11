import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The languages the error catalogue speaks (`BaseError.messageDict`): the
 * dashboard's two, with `en` as the fallback for everything else.
 */
export type MessageLocale = 'en' | 'zh-CN';

const DEFAULT_LOCALE: MessageLocale = 'en';

/**
 * Picks the catalogue language for an `Accept-Language` value. Tags are
 * read in the order sent (browsers and the dashboard list them by
 * preference); the first tag whose language the catalogue has wins, so
 * `zh-Hans`, `zh-CN` and `zh-TW` all read the Simplified Chinese entry.
 */
export function resolveMessageLocale(acceptLanguage: string | string[] | undefined): MessageLocale {
  const header = Array.isArray(acceptLanguage) ? acceptLanguage.join(',') : acceptLanguage;
  if (!header) {
    return DEFAULT_LOCALE;
  }
  for (const entry of header.split(',')) {
    const language = entry.split(';')[0].trim().toLowerCase().split('-')[0];
    if (language === 'en') {
      return 'en';
    }
    if (language === 'zh') {
      return 'zh-CN';
    }
  }
  return DEFAULT_LOCALE;
}

const storage = new AsyncLocalStorage<MessageLocale>();

/**
 * The language of the request being served, entered once per HTTP request
 * by the middleware in main.ts, so code with no request in hand (Apollo's
 * `formatError`) can still answer in it. Outside a request: `en`.
 */
export const requestLocale = {
  run<T>(locale: MessageLocale, fn: () => T): T {
    return storage.run(locale, fn);
  },
  get(): MessageLocale {
    return storage.getStore() ?? DEFAULT_LOCALE;
  },
};
