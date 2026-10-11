import { DEFAULT_LANGUAGE, type Language } from '@/i18n/languages';
import { STRUTTURA } from './index';
import enGlossario from './en/glossario.json';
import itGlossario from './it/glossario.json';
import { getAllLessons, type Lesson } from './lessons';
import { glossarySchema, type Glossary } from './schema';

/**
 * Glossario: una voce per ogni concetto introdotto da una lezione.
 * Testi in src/content/<lingua>/glossario.json, chiave = id del concetto.
 */
const GLOSSARI: Record<Language, Glossary> = {
  it: glossarySchema.parse(itGlossario),
  en: glossarySchema.parse(enGlossario),
};

export interface GlossaryEntry {
  id: string;
  termine: string;
  definizione: string;
  /** La lezione che introduce il concetto (per il collegamento "Vai alla lezione"). */
  introducedIn?: Lesson;
}

/** Concetto → lezione che lo introduce, seguendo l'ordine del corso. */
export function conceptOrigins(language: Language): Map<string, Lesson> {
  const lessons = getAllLessons(language);
  const origins = new Map<string, Lesson>();
  for (const mondo of STRUTTURA) {
    for (const levelId of mondo.livelli) {
      for (const lesson of lessons[levelId] ?? []) {
        for (const concept of lesson.concetti_introdotti) {
          if (!origins.has(concept)) origins.set(concept, lesson);
        }
      }
    }
  }
  return origins;
}

export function getGlossary(language: Language): Glossary {
  return GLOSSARI[language];
}

export function getGlossaryEntry(language: Language, id: string): GlossaryEntry | undefined {
  const entry = GLOSSARI[language][id] ?? GLOSSARI[DEFAULT_LANGUAGE][id];
  if (!entry) return undefined;
  return { id, ...entry, introducedIn: conceptOrigins(language).get(id) };
}

/** Tutte le voci in ordine alfabetico del termine. */
export function getGlossaryEntries(language: Language): GlossaryEntry[] {
  const origins = conceptOrigins(language);
  return Object.entries(GLOSSARI[language])
    .map(([id, entry]) => ({ id, ...entry, introducedIn: origins.get(id) }))
    .sort((a, b) => a.termine.localeCompare(b.termine, language));
}
