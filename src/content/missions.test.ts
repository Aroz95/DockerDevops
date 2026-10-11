import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '@/i18n/languages';
import { STRUTTURA } from './index';
import { getLessons } from './lessons';
import { getMissionData } from './missions';
import { BLANK } from './missions-schema';

const { logic, texts } = getMissionData();
const LEVEL_IDS = STRUTTURA.flatMap((mondo) => mondo.livelli);

describe('logica delle missioni', () => {
  it('appartiene a livelli esistenti', () => {
    expect(Object.keys(logic).filter((id) => !LEVEL_IDS.includes(id))).toEqual([]);
  });

  it('ha id unici in tutto il corso', () => {
    const ids = Object.values(logic).flatMap((missions) => missions.map((m) => m.id));
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('ogni missione dipende da una lezione del suo stesso livello', () => {
    const problems = Object.entries(logic).flatMap(([levelId, missions]) => {
      const lessonIds = getLessons('it', levelId).map((lesson) => lesson.id);
      return missions
        .filter((mission) => !lessonIds.includes(mission.dopoLezione))
        .map((mission) => `${levelId}/${mission.id}: dopoLezione "${mission.dopoLezione}"`);
    });
    expect(problems).toEqual([]);
  });

  it('le risposte giuste sono tra le opzioni', () => {
    for (const missions of Object.values(logic)) {
      for (const mission of missions) {
        if (mission.tipo === 'scelta') expect(mission.opzioni).toContain(mission.corretta);
        if (mission.tipo === 'scelta-multipla') {
          expect(mission.corrette.filter((id) => !mission.opzioni.includes(id))).toEqual([]);
        }
      }
    }
  });
});

describe.each(LANGUAGES)('testi delle missioni in "%s"', (language) => {
  it('esistono per ogni missione e solo per quelle', () => {
    for (const [levelId, missions] of Object.entries(logic)) {
      const levelTexts = texts[language][levelId] ?? {};
      expect(Object.keys(levelTexts).sort(), levelId).toEqual(missions.map((m) => m.id).sort());
    }
    expect(Object.keys(texts[language]).filter((id) => !logic[id])).toEqual([]);
  });

  it('descrivono ogni opzione e hanno spazi coerenti con le risposte', () => {
    const problems: string[] = [];
    for (const [levelId, missions] of Object.entries(logic)) {
      for (const mission of missions) {
        const text = texts[language][levelId]?.[mission.id];
        if (!text) continue;
        const where = `${levelId}/${mission.id}`;
        const ids =
          mission.tipo === 'ordina'
            ? mission.elementi
            : mission.tipo === 'completa'
              ? []
              : mission.opzioni;
        for (const id of ids) {
          if (!text.opzioni?.[id]) problems.push(`${where}: manca il testo di "${id}"`);
        }
        for (const id of Object.keys(text.feedback ?? {})) {
          if (!ids.includes(id)) problems.push(`${where}: feedback per opzione inesistente "${id}"`);
        }
        if (mission.tipo === 'completa') {
          const blanks = (text.modello ?? '').split(BLANK).length - 1;
          if (blanks !== mission.risposte.length) {
            problems.push(`${where}: ${blanks} spazi "___" ma ${mission.risposte.length} risposte`);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('hanno lo stesso numero di suggerimenti in ogni lingua', () => {
    for (const [levelId, missions] of Object.entries(logic)) {
      for (const mission of missions) {
        const counts = LANGUAGES.map((lang) => texts[lang][levelId]?.[mission.id]?.suggerimenti.length);
        expect(new Set(counts).size, `${levelId}/${mission.id}`).toBe(1);
      }
    }
  });
});
