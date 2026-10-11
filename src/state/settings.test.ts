import { describe, expect, it } from 'vitest';
import { loadSettings, sanitizeSettings, saveSettings, settingsReducer, type Settings } from './settings';
import { STORAGE_PREFIX } from './storage';

const base: Settings = { language: 'it', theme: 'system' };

describe('settingsReducer', () => {
  it('cambia lingua e tema', () => {
    expect(settingsReducer(base, { type: 'setLanguage', language: 'en' })).toEqual({
      language: 'en',
      theme: 'system',
    });
    expect(settingsReducer(base, { type: 'setTheme', theme: 'dark' })).toEqual({
      language: 'it',
      theme: 'dark',
    });
  });

  it('restituisce lo stesso oggetto se nulla cambia (niente render inutili)', () => {
    expect(settingsReducer(base, { type: 'setLanguage', language: 'it' })).toBe(base);
    expect(settingsReducer(base, { type: 'setTheme', theme: 'system' })).toBe(base);
  });
});

describe('sanitizeSettings', () => {
  it('scarta valori non validi e tiene quelli validi', () => {
    expect(sanitizeSettings({ language: 'fr', theme: 'dark' }).theme).toBe('dark');
    expect(sanitizeSettings({ language: 'en', theme: 'viola' }).language).toBe('en');
    expect(sanitizeSettings({ language: 'en', theme: 'viola' }).theme).toBe('system');
  });

  it('gestisce dati assenti o corrotti', () => {
    for (const raw of [undefined, null, 42, 'testo', []]) {
      const result = sanitizeSettings(raw);
      expect(['it', 'en']).toContain(result.language);
      expect(result.theme).toBe('system');
    }
  });
});

describe('persistenza', () => {
  it('salva e rilegge le impostazioni', () => {
    saveSettings({ language: 'en', theme: 'dark' });
    expect(loadSettings()).toEqual({ language: 'en', theme: 'dark' });
  });

  it('usa la stessa chiave letta dallo script di index.html', () => {
    saveSettings({ language: 'it', theme: 'dark' });
    expect(window.localStorage.getItem(`${STORAGE_PREFIX}settings`)).not.toBeNull();
    expect(window.localStorage.getItem('ddc:settings')).not.toBeNull();
  });

  it('ignora JSON non valido', () => {
    window.localStorage.setItem('ddc:settings', '{non è json');
    expect(loadSettings().theme).toBe('system');
  });
});
