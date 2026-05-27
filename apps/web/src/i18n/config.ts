import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enUSUi from '@usertour/i18n/en-US/ui';
import zhHansUi from '@usertour/i18n/zh-Hans/ui';

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: process.env.NODE_ENV === 'development',
    defaultNS: 'ui',
    // Resource keys match the folder names in packages/i18n/src/ so a
    // missing translation can be traced from key → folder in one step.
    // Script subtags (zh-Hans / zh-Hant) per W3C i18n guidance — region
    // codes like zh-CN don't disambiguate Simplified vs Traditional
    // (Singapore is zh-SG + Simplified; Hong Kong is zh-HK + Traditional).
    resources: {
      en: {
        ui: enUSUi,
      },
      'zh-Hans': {
        ui: zhHansUi,
      },
    },
    supportedLngs: ['en', 'zh-Hans'],
    // The browser sends BCP-47 region tags (zh-CN, zh-SG, ...) but we
    // ship by script. Map every Simplified-Chinese region to zh-Hans;
    // unmapped variants (zh-HK, zh-TW are Traditional — no data yet) and
    // anything else fall through to English.
    fallbackLng: {
      'zh-CN': ['zh-Hans', 'en'],
      'zh-SG': ['zh-Hans', 'en'],
      'zh-MY': ['zh-Hans', 'en'],
      zh: ['zh-Hans', 'en'],
      default: ['en'],
    },
    // if you see an error like: "Argument of type 'DefaultTFuncReturn' is not assignable to parameter of type xyz"
    // set returnNull to false (and also in the i18next.d.ts options)
    // returnNull: false,
  });
