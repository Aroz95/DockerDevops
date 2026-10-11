import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language } from '@/i18n/languages';
import { saveSettings, settingsReducer, type Settings, type Theme } from '@/state/settings';
import { SettingsContext, type SettingsContextValue } from './settings-context';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_QUERY).matches
    : false;
}

interface SettingsProviderProps {
  initialSettings: Settings;
  children: ReactNode;
}

/** Lingua e tema: li applica alla pagina e li ricorda tra una visita e l'altra. */
export function SettingsProvider({ initialSettings, children }: SettingsProviderProps) {
  const [settings, dispatch] = useReducer(settingsReducer, initialSettings);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const { i18n } = useTranslation();

  // Segue i cambi di tema del sistema operativo quando il tema è "system".
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  useEffect(() => {
    document.documentElement.lang = settings.language;
    if (i18n.language !== settings.language) void i18n.changeLanguage(settings.language);
  }, [settings.language, i18n]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const setLanguage = useCallback(
    (language: Language) => dispatch({ type: 'setLanguage', language }),
    [],
  );
  const setTheme = useCallback((theme: Theme) => dispatch({ type: 'setTheme', theme }), []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, isDark, setLanguage, setTheme }),
    [settings, isDark, setLanguage, setTheme],
  );

  return <SettingsContext value={value}>{children}</SettingsContext>;
}
