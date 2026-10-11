import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import i18n, { initI18n } from '@/i18n';

// jsdom non implementa queste API del browser: ne forniamo versioni minime.
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

initI18n('it');

afterEach(async () => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.className = '';
  await i18n.changeLanguage('it');
});
