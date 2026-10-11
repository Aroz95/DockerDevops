import type { z } from 'zod';
import { DEFAULT_LANGUAGE, isLanguage, LANGUAGES, type Language } from '@/i18n/languages';
import {
  missionLogicFileSchema,
  missionTextFileSchema,
  type MissionLogic,
  type MissionText,
} from './missions-schema';

/**
 * Missioni del corso, in due parti:
 * - logica (risposte giuste, XP, ordine): src/content/esercizi/<id-livello>.json
 * - testi (domande, opzioni, suggerimenti): src/content/<lingua>/esercizi/<id-livello>.json
 * Una correzione alla logica vale così per tutte le lingue.
 */
const logicFiles = import.meta.glob<unknown>('./esercizi/*.json', { eager: true, import: 'default' });
const textFiles = import.meta.glob<unknown>('./*/esercizi/*.json', { eager: true, import: 'default' });

export type Mission = MissionLogic & { text: MissionText; levelId: string };

function levelIdOf(file: string): string {
  return file.split('/').pop()?.replace(/\.json$/, '') ?? '';
}

function parseOrThrow<S extends z.ZodType>(schema: S, data: unknown, file: string): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.map(String).join('.')}: ${i.message}`);
    throw new Error(`Dati non validi in ${file}: ${issues.join('; ')}`);
  }
  return result.data;
}

const LOGIC: Record<string, MissionLogic[]> = Object.fromEntries(
  Object.entries(logicFiles).map(([file, data]) => [
    levelIdOf(file),
    parseOrThrow(missionLogicFileSchema, data, file).missioni,
  ]),
);

const TEXTS = Object.fromEntries(LANGUAGES.map((lang) => [lang, {}])) as Record<
  Language,
  Record<string, Record<string, MissionText>>
>;
for (const [file, data] of Object.entries(textFiles)) {
  const language = file.split('/')[1] ?? '';
  if (!isLanguage(language)) throw new Error(`Lingua sconosciuta nel percorso ${file}`);
  TEXTS[language][levelIdOf(file)] = parseOrThrow(missionTextFileSchema, data, file);
}

/** Missioni di un livello nella lingua scelta (testi mancanti → lingua di riserva). */
export function getMissions(language: Language, levelId: string): Mission[] {
  return (LOGIC[levelId] ?? []).flatMap((logic) => {
    const text = TEXTS[language][levelId]?.[logic.id] ?? TEXTS[DEFAULT_LANGUAGE][levelId]?.[logic.id];
    return text ? [{ ...logic, text, levelId }] : [];
  });
}

/** Per i test: logica e testi grezzi. */
export function getMissionData() {
  return { logic: LOGIC, texts: TEXTS };
}
