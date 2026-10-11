import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { DEFAULT_LANGUAGE, isLanguage, LANGUAGES, type Language } from '@/i18n/languages';
import { lessonFrontmatterSchema, type LessonFrontmatter } from './schema';

/**
 * Lezioni del corso.
 *
 * Percorso di ogni file: src/content/<lingua>/<id-livello>/<NN>-<nome>.mdx
 * - <id-livello> è uno degli id di src/content/mondi.json;
 * - <NN> (01, 02…) decide l'ordine delle lezioni nel livello.
 *
 * I metadati (frontmatter) vengono caricati subito; il testo della lezione solo quando serve,
 * così ogni lezione è un piccolo file separato e il sito resta veloce.
 */

/** Componenti che una lezione MDX può usare (Callout, Termine…), passati al momento del render. */
export type MdxComponents = Record<string, ComponentType<never>>;
export type LessonComponent = ComponentType<{ components?: MdxComponents }>;

const frontmatters = import.meta.glob<unknown>('./*/*/*.mdx', {
  eager: true,
  import: 'frontmatter',
});
const loaders = import.meta.glob<{ default: LessonComponent }>('./*/*/*.mdx');

export interface Lesson extends LessonFrontmatter {
  language: Language;
  levelId: string;
  /** Percorso del file, utile nei messaggi d'errore e per il futuro pulsante "Modifica". */
  file: string;
}

const PATH_PATTERN = /^\.\/([a-z]{2})\/([a-z0-9-]+)\/(\d{2})-[a-z0-9-]+\.mdx$/;

function buildIndex(): Record<Language, Record<string, Lesson[]>> {
  const index = Object.fromEntries(LANGUAGES.map((lang) => [lang, {}])) as Record<
    Language,
    Record<string, Lesson[]>
  >;

  for (const [file, raw] of Object.entries(frontmatters).sort(([a], [b]) => a.localeCompare(b))) {
    const match = PATH_PATTERN.exec(file);
    if (!match) {
      throw new Error(`Nome di file lezione non valido: ${file} (atteso <lingua>/<livello>/NN-nome.mdx)`);
    }
    const [, language = '', levelId = ''] = match;
    if (!isLanguage(language)) {
      throw new Error(`Lingua sconosciuta "${language}" nel percorso ${file}`);
    }
    const parsed = lessonFrontmatterSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new Error(`Frontmatter non valido in ${file}: ${issues}`);
    }
    const byLevel = index[language] ?? (index[language] = {});
    (byLevel[levelId] ??= []).push({ ...parsed.data, language, levelId, file });
  }
  return index;
}

const INDEX = buildIndex();

/** Lezioni di un livello, in ordine. Se la lingua non ha la lezione si usa la lingua di riserva. */
export function getLessons(language: Language, levelId: string): Lesson[] {
  return INDEX[language]?.[levelId] ?? INDEX[DEFAULT_LANGUAGE]?.[levelId] ?? [];
}

export function getLesson(language: Language, levelId: string, lessonId: string): Lesson | undefined {
  return getLessons(language, levelId).find((lesson) => lesson.id === lessonId);
}

/** Tutte le lezioni di una lingua, raggruppate per livello (per i test e il glossario). */
export function getAllLessons(language: Language): Record<string, Lesson[]> {
  return INDEX[language] ?? {};
}

const componentCache = new Map<string, LazyExoticComponent<LessonComponent>>();

/** Il testo della lezione come componente React, caricato al primo utilizzo. */
export function getLessonComponent(lesson: Lesson): LazyExoticComponent<LessonComponent> {
  let component = componentCache.get(lesson.file);
  if (!component) {
    const load = loaders[lesson.file];
    if (!load) throw new Error(`Lezione non trovata: ${lesson.file}`);
    component = lazy(load);
    componentCache.set(lesson.file, component);
  }
  return component;
}
