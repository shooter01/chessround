import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './locales/translations';

// Determine default language (saved or fallback to 'en')
const savedLang = window.localStorage.getItem('app-language') || 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
