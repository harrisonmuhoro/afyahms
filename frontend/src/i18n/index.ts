import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import sw from './locales/sw.json';

const SUPPORTED_LOCALES = (import.meta.env.VITE_SUPPORTED_LOCALES || 'en,sw').split(',');

// Each top-level key of the locale JSON files is exposed as its own i18next
// namespace (e.g. `auth`, `common`), which is how components reference keys
// via `t('auth:login.title')`.
const NAMESPACES = Object.keys(en);

function detectInitialLocale(): string {
  const saved = localStorage.getItem('afya.locale');
  if (saved && SUPPORTED_LOCALES.includes(saved)) {
    return saved;
  }

  const browser = navigator.language.split('-')[0];
  if (SUPPORTED_LOCALES.includes(browser)) {
    return browser;
  }

  return import.meta.env.VITE_DEFAULT_LOCALE || 'en';
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en,
      sw,
    },
    ns: NAMESPACES,
    defaultNS: 'common',
    lng: detectInitialLocale(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    react: { useSuspense: false },
  });

export { i18n, SUPPORTED_LOCALES };