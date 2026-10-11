import { describe, expect, it } from 'vitest';
import { LANGUAGES } from './languages';
import { resources } from './index';

/** Elenco piatto delle chiavi: { a: { b: 'x' } } → ['a.b']. */
function flatKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flatKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('traduzioni interfaccia', () => {
  const reference = flatKeys(resources.it.ui).sort();

  it.each(LANGUAGES)('la lingua "%s" ha esattamente le stesse chiavi dell\'italiano', (lang) => {
    expect(flatKeys(resources[lang].ui).sort()).toEqual(reference);
  });

  it.each(LANGUAGES)('nessun testo vuoto in "%s"', (lang) => {
    const empty = flatKeys(resources[lang].ui).filter((key) => {
      const text = key
        .split('.')
        .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], resources[lang].ui);
      return typeof text !== 'string' || text.trim() === '';
    });
    expect(empty).toEqual([]);
  });
});
