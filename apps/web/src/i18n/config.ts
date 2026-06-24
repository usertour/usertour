import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import enUSUi from '@usertour/i18n/en-US/ui';
import zhHansUi from '@usertour/i18n/zh-Hans/ui';

// English-only for now — pinned, with NO browser-language detection.
//
// zh-Hans ships and is kept current, but it hasn't been proofread, so we
// don't expose it yet. Crucially we do NOT auto-detect the browser language:
// a Chinese-locale browser must not be silently switched into an unreviewed
// translation. The strings stay in the bundle (we keep validating them in dev
// and opening a language later stays cheap), but there is no runtime path to
// reach them — `lng` is pinned and `supportedLngs` is English-only.
//
// To open a language once proofread: add it back to `supportedLngs` and
// surface an explicit in-app language picker that persists the choice. Keep it
// opt-in — re-introducing navigator detection would bring this problem back.
i18next.use(initReactI18next).init({
  debug: process.env.NODE_ENV === 'development',
  defaultNS: 'ui',
  // Resource keys match the folder names in packages/i18n/src/ so a missing
  // translation can be traced from key → folder in one step.
  resources: {
    en: {
      ui: enUSUi,
    },
    'zh-Hans': {
      ui: zhHansUi,
    },
  },
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en'],
  interpolation: {
    // React already escapes rendered text, so i18next must NOT escape too —
    // otherwise interpolated values are double-escaped and render literally:
    // a date "7/1/2026" becomes "7&#x2F;1&#x2F;2026", a URL's "&" → "&amp;".
    escapeValue: false,
  },
});
