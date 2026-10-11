import { describe, expect, it } from 'vitest';
import {
  checkChoice,
  checkFill,
  checkMultipleChoice,
  checkOrder,
  normalizeAnswer,
  seededShuffle,
} from './checkers';

describe('scelta singola', () => {
  it('riconosce la risposta giusta e quella sbagliata', () => {
    expect(checkChoice('b', 'b').passed).toBe(true);
    expect(checkChoice('a', 'b')).toEqual({ tipo: 'scelta', passed: false, selected: 'a' });
    expect(checkChoice(null, 'b').passed).toBe(false);
  });
});

describe('scelta multipla', () => {
  it('passa solo con tutte le giuste e nessuna sbagliata', () => {
    expect(checkMultipleChoice(['a', 'c'], ['a', 'c']).passed).toBe(true);
    expect(checkMultipleChoice(['c', 'a'], ['a', 'c']).passed).toBe(true);
  });

  it('dice cosa è giusto, cosa è sbagliato e quante ne mancano', () => {
    expect(checkMultipleChoice(['a', 'b'], ['a', 'c', 'd'])).toEqual({
      tipo: 'scelta-multipla',
      passed: false,
      rightSelected: ['a'],
      wrongSelected: ['b'],
      missing: 2,
    });
  });
});

describe('ordina', () => {
  it('indica quali posizioni sono giuste', () => {
    expect(checkOrder(['a', 'b', 'c'], ['a', 'b', 'c']).passed).toBe(true);
    expect(checkOrder(['b', 'a', 'c'], ['a', 'b', 'c'])).toEqual({
      tipo: 'ordina',
      passed: false,
      correctAt: [false, false, true],
    });
  });
});

describe('completa', () => {
  it('ignora gli spazi in più', () => {
    expect(normalizeAnswer('  docker   run  ', false)).toBe('docker run');
  });

  it('per i comandi le maiuscole contano, per le parole no', () => {
    expect(checkFill(['Run'], [['run']], false).passed).toBe(false);
    expect(checkFill(['GITHUB'], [['GitHub']], true).passed).toBe(true);
  });

  it('accetta varianti e valuta ogni spazio', () => {
    expect(checkFill(['github.com', 'x'], [['GitHub', 'github.com'], ['y']], true)).toEqual({
      tipo: 'completa',
      passed: false,
      blanks: [true, false],
    });
  });

  it('uno spazio vuoto non è mai giusto', () => {
    expect(checkFill([''], [['']], true).passed).toBe(false);
  });
});

describe('mescolamento ripetibile', () => {
  const items = ['a', 'b', 'c', 'd'];

  it('dà sempre lo stesso ordine con lo stesso seme', () => {
    expect(seededShuffle(items, 'missione-1')).toEqual(seededShuffle(items, 'missione-1'));
  });

  it('non lascia mai l\'ordine giusto e non perde elementi', () => {
    for (const seed of ['a', 'b', 'c', 'missione', 'struttura-corso', 'xyz']) {
      const shuffled = seededShuffle(items, seed);
      expect(shuffled).not.toEqual(items);
      expect([...shuffled].sort()).toEqual(items);
    }
  });
});
