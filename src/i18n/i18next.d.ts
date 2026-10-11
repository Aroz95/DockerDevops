import 'i18next';
import type ui from './locales/it/ui.json';

// Chiavi tipizzate: t('chiave.inesistente') diventa un errore di compilazione.
// L'italiano è la lingua di riferimento; il test locales.test.ts verifica che l'inglese abbia le stesse chiavi.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'ui';
    resources: {
      ui: typeof ui;
    };
  }
}
