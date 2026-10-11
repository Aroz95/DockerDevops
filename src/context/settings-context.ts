import { createContext } from 'react';
import type { Language } from '@/i18n/languages';
import type { Settings, Theme } from '@/state/settings';

export interface SettingsContextValue {
  settings: Settings;
  /** true se in questo momento la pagina è mostrata con il tema scuro. */
  isDark: boolean;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);
