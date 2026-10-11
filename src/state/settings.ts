import { detectBrowserLanguage, isLanguage, type Language } from '@/i18n/languages';
import { readJSON, writeJSON } from './storage';

export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

export interface Settings {
  language: Language;
  theme: Theme;
}

export type SettingsAction =
  | { type: 'setLanguage'; language: Language }
  | { type: 'setTheme'; theme: Theme };

/** Chiave in localStorage (con prefisso "ddc:"). Usata anche dallo script in index.html. */
export const SETTINGS_KEY = 'settings';

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

export function defaultSettings(): Settings {
  return { language: detectBrowserLanguage(), theme: 'system' };
}

/** Accetta dati salvati da versioni precedenti o modificati a mano: tiene solo i campi validi. */
export function sanitizeSettings(raw: unknown): Settings {
  const fallback = defaultSettings();
  if (typeof raw !== 'object' || raw === null) return fallback;
  const data = raw as Record<string, unknown>;
  return {
    language: isLanguage(data.language) ? data.language : fallback.language,
    theme: isTheme(data.theme) ? data.theme : fallback.theme,
  };
}

export function loadSettings(): Settings {
  return sanitizeSettings(readJSON(SETTINGS_KEY));
}

export function saveSettings(settings: Settings): void {
  writeJSON(SETTINGS_KEY, settings);
}

export function settingsReducer(state: Settings, action: SettingsAction): Settings {
  switch (action.type) {
    case 'setLanguage':
      return state.language === action.language ? state : { ...state, language: action.language };
    case 'setTheme':
      return state.theme === action.theme ? state : { ...state, theme: action.theme };
  }
}
