/** Lingue disponibili. Per aggiungerne una: nuovo codice qui + cartella in locales/ e in content/. */
export const LANGUAGES = ['it', 'en'] as const;

export type Language = (typeof LANGUAGES)[number];

/** Lingua di riserva: usata se manca una traduzione o la lingua del browser non è supportata. */
export const DEFAULT_LANGUAGE: Language = 'it';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/** Alla prima visita si usa la lingua del browser, se supportata. */
export function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of preferred) {
    const code = tag?.toLowerCase().split('-')[0];
    if (isLanguage(code)) return code;
  }
  return DEFAULT_LANGUAGE;
}
