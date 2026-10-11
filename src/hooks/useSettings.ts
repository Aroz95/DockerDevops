import { use } from 'react';
import { SettingsContext, type SettingsContextValue } from '@/context/settings-context';

export function useSettings(): SettingsContextValue {
  const context = use(SettingsContext);
  if (!context) {
    throw new Error('useSettings va usato dentro <SettingsProvider>.');
  }
  return context;
}
