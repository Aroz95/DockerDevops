import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '@/i18n/languages';
import { getMondi, STRUTTURA, TESTI } from './index';

describe('struttura del corso', () => {
  const tuttiILivelli = STRUTTURA.flatMap((mondo) => mondo.livelli);

  it('ha 7 mondi e 36 livelli, come nel piano', () => {
    expect(STRUTTURA).toHaveLength(7);
    expect(tuttiILivelli).toHaveLength(36);
  });

  it('non ha id duplicati', () => {
    expect(new Set(tuttiILivelli).size).toBe(tuttiILivelli.length);
    expect(new Set(STRUTTURA.map((m) => m.id)).size).toBe(STRUTTURA.length);
  });

  it('numera i livelli da 0 a 35 senza buchi', () => {
    const numeri = getMondi('it').flatMap((m) => m.livelli.map((l) => l.numero));
    expect(numeri).toEqual(Array.from({ length: 36 }, (_, i) => i));
  });
});

describe.each(LANGUAGES)('testi dei mondi in "%s"', (lang) => {
  const testi = TESTI[lang];

  it('ogni mondo ha titolo, descrizione e boss', () => {
    for (const mondo of STRUTTURA) {
      const t = testi.mondi[mondo.id];
      expect(t, `mondo "${mondo.id}"`).toBeDefined();
      expect(t?.titolo.trim()).not.toBe('');
      expect(t?.descrizione.trim()).not.toBe('');
      expect(t?.boss.trim()).not.toBe('');
    }
  });

  it('ogni livello ha un titolo', () => {
    for (const id of STRUTTURA.flatMap((m) => m.livelli)) {
      expect(testi.livelli[id]?.trim(), `livello "${id}"`).toBeTruthy();
    }
  });

  it('non contiene testi per id che non esistono più', () => {
    const idMondi = new Set(STRUTTURA.map((m) => m.id));
    const idLivelli = new Set(STRUTTURA.flatMap((m) => m.livelli));
    expect(Object.keys(testi.mondi).filter((id) => !idMondi.has(id))).toEqual([]);
    expect(Object.keys(testi.livelli).filter((id) => !idLivelli.has(id))).toEqual([]);
  });
});
