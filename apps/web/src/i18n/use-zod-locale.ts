import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { en, zhCN } from 'zod/v4/locales';

/**
 * Drives Zod 4's global error map from the i18next language so every
 * `z.string().min(...)`, `.email()`, `.url()`, etc. failure is rendered
 * in the user's language without each schema mentioning messages.
 *
 * Per-method overrides (`.min(8, { error: 'msg' })`) still beat the
 * locale when the form needs a domain-specific message (e.g. password
 * rules in the auth module). The locale only fills in the default.
 *
 * Mount once near the React root. Subsequent language switches via the
 * i18n picker re-run the effect and swap the locale map.
 */
export const useZodLocale = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    // i18n.language follows our resource keys: 'zh-Hans' for Simplified
    // Chinese (any region), 'en' for everything else via fallbackLng.
    const localeError = i18n.language === 'zh-Hans' ? zhCN().localeError : en().localeError;
    z.config({ localeError });
  }, [i18n.language]);
};
