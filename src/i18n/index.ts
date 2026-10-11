import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enUi from './locales/en/ui.json';
import itUi from './locales/it/ui.json';
import { DEFAULT_LANGUAGE, LANGUAGES, type Language } from './languages';

/**
 * Testi dell'interfaccia (pulsanti, menu, messaggi).
 * I contenuti del corso (lezioni, esercizi) NON passano da qui: vivono in src/content/<lingua>/.
 */
export const resources = {
  it: { ui: itUi },
  en: { ui: enUi },
} as const;

export function initI18n(language: Language) {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: [...LANGUAGES],
      defaultNS: 'ui',
      ns: ['ui'],
      interpolation: { escapeValue: false }, // React protegge già dall'HTML malevolo
      initAsync: false, // le traduzioni sono già nel bundle: inizializzazione immediata
    });
  } else if (i18n.language !== language) {
    void i18n.changeLanguage(language);
  }
  return i18n;
}

export default i18n;
