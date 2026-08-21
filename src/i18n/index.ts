import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import trCommon from './locales/tr/common.json';
import enCommon from './locales/en/common.json';

void i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: { tr: { common: trCommon }, en: { common: enCommon } },
  supportedLngs: ['tr', 'en'],
  fallbackLng: 'tr',
  defaultNS: 'common',
  keySeparator: false,
  interpolation: { escapeValue: false },
  detection: {
    order: ['localStorage', 'navigator'],
    caches: ['localStorage'],
    lookupLocalStorage: 'teknotakip-language',
  },
});

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language.startsWith('en') ? 'en' : 'tr';
});

export default i18n;
