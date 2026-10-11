/**
 * Controlli automatici sulle regole didattiche del piano del corso:
 * - 3.1: nessun concetto usato prima di essere introdotto;
 * - 8.4: le due lingue hanno le stesse lezioni con gli stessi metadati tecnici;
 * - 10.1: fonti solo dal registro ufficiale;
 * - glossario completo per ogni concetto introdotto.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '@/i18n/languages';
import { getGlossary } from './glossary';
import { STRUTTURA } from './index';
import { getAllLessons, type Lesson } from './lessons';
import { isOfficialSource } from './schema';

/** Testo originale del file .mdx (lesson.file è relativo a questa cartella). */
function rawSource(lesson: Lesson): string {
  return readFileSync(new URL(lesson.file, import.meta.url), 'utf8');
}

const LEVEL_IDS = STRUTTURA.flatMap((mondo) => mondo.livelli);

/** Lezioni di una lingua nell'ordine del corso. */
function lessonsInOrder(language: (typeof LANGUAGES)[number]): Lesson[] {
  const all = getAllLessons(language);
  return LEVEL_IDS.flatMap((levelId) => all[levelId] ?? []);
}

/** id usati in <Termine id="..."> dentro il testo della lezione. */
function termsUsed(lesson: Lesson): string[] {
  return [...rawSource(lesson).matchAll(/<Termine\s+id="([^"]+)"/g)].map((match) => match[1] ?? '');
}

describe.each(LANGUAGES)('lezioni in "%s"', (language) => {
  const lessons = lessonsInOrder(language);
  const all = getAllLessons(language);

  it('stanno solo in cartelle di livelli esistenti', () => {
    expect(Object.keys(all).filter((id) => !LEVEL_IDS.includes(id))).toEqual([]);
  });

  it('hanno id unici in tutto il corso', () => {
    const ids = lessons.map((lesson) => lesson.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('non usano concetti prima di averli introdotti (regola 3.1)', () => {
    const introduced = new Set<string>();
    const problems: string[] = [];
    for (const lesson of lessons) {
      for (const concept of lesson.concetti_richiesti) {
        if (!introduced.has(concept)) {
          problems.push(`${lesson.file}: richiede "${concept}", non ancora introdotto`);
        }
      }
      for (const concept of lesson.concetti_introdotti) {
        if (introduced.has(concept)) {
          problems.push(`${lesson.file}: introduce di nuovo "${concept}"`);
        }
      }
      const available = new Set([...introduced, ...lesson.concetti_introdotti]);
      for (const term of termsUsed(lesson)) {
        if (!available.has(term)) {
          problems.push(`${lesson.file}: <Termine id="${term}"> usato prima di essere introdotto`);
        }
      }
      lesson.concetti_introdotti.forEach((concept) => introduced.add(concept));
    }
    expect(problems).toEqual([]);
  });

  it('ogni concetto introdotto ha la sua voce nel glossario, e viceversa', () => {
    const glossary = getGlossary(language);
    const introduced = lessons.flatMap((lesson) => lesson.concetti_introdotti);
    expect(introduced.filter((concept) => !glossary[concept])).toEqual([]);
    expect(Object.keys(glossary).filter((id) => !introduced.includes(id))).toEqual([]);
  });

  it('citano solo fonti ufficiali dal registro', () => {
    const bad = lessons.flatMap((lesson) =>
      lesson.fonti.filter((fonte) => !isOfficialSource(fonte.url)).map((f) => `${lesson.file}: ${f.url}`),
    );
    expect(bad).toEqual([]);
  });
});

describe('parità tra le lingue', () => {
  const [reference, ...others] = LANGUAGES;
  const base = lessonsInOrder(reference);

  it.each(others)('"%s" ha le stesse lezioni, nello stesso ordine e con gli stessi metadati', (language) => {
    const technical = (lesson: Lesson) => ({
      file: lesson.file.replace(/^\.\/[a-z]{2}\//, ''),
      id: lesson.id,
      tipo: lesson.tipo,
      durata: lesson.durata,
      concetti_richiesti: lesson.concetti_richiesti,
      concetti_introdotti: lesson.concetti_introdotti,
      fonti: lesson.fonti.map((fonte) => fonte.url),
      verificata_il: lesson.verificata_il,
    });
    expect(lessonsInOrder(language).map(technical)).toEqual(base.map(technical));
  });

  it.each(others)('"%s" usa gli stessi termini del glossario', (language) => {
    const translated = lessonsInOrder(language);
    base.forEach((lesson, i) => {
      const other = translated[i];
      expect(other && termsUsed(other).sort()).toEqual(termsUsed(lesson).sort());
    });
  });
});

describe('registro delle fonti', () => {
  it('ammette solo https e domini elencati', () => {
    expect(isOfficialSource('https://docs.docker.com/get-started/')).toBe(true);
    expect(isOfficialSource('https://docs.github.com/en/codespaces')).toBe(true);
    expect(isOfficialSource('https://github.com/compose-spec/compose-spec')).toBe(true);
    expect(isOfficialSource('https://github.com/qualcuno/blog')).toBe(false);
    expect(isOfficialSource('http://docs.docker.com/')).toBe(false);
    expect(isOfficialSource('https://medium.com/docker-tutorial')).toBe(false);
    expect(isOfficialSource('non è un url')).toBe(false);
  });
});
