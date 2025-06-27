import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      menu: {
        play: 'Play',
        puzzles: 'Puzzles',
        learn: 'Learn',
        watch: 'Watch',
        community: 'Community',
        tools: 'Tools',
        donate: 'Donate',
      },
      toggle: {
        dark: 'Dark Mode',
        light: 'Light Mode',
      },
      language: {
        en: 'English',
        ru: 'Русский',
      },
      // add other keys as needed
    },
  },
  ru: {
    translation: {
      menu: {
        play: 'Играть',
        puzzles: 'Головоломки',
        learn: 'Учиться',
        watch: 'Смотреть',
        community: 'Сообщество',
        tools: 'Инструменты',
        donate: 'Пожертвовать',
      },
      toggle: {
        dark: 'Тёмная тема',
        light: 'Светлая тема',
      },
      language: {
        en: 'English',
        ru: 'Русский',
      },
    },
  },
};

// Determine default language (saved or fallback to 'en')
const savedLang = window.localStorage.getItem('app-language') || 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
