import { z } from 'zod';
import fonti from './fonti.json';

/** Un dominio è ammesso se l'URL inizia con "<dominio>" o "<sottodominio>.<dominio>" (anche con un percorso). */
export function isOfficialSource(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  return fonti.domini.some((domain) => {
    const [host = '', ...pathParts] = domain.split('/');
    const path = pathParts.length ? `/${pathParts.join('/')}` : '';
    const hostOk = parsed.hostname === host || parsed.hostname.endsWith(`.${host}`);
    return hostOk && parsed.pathname.startsWith(path);
  });
}

const conceptId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id concetto: minuscolo-con-trattini');

/**
 * Metadati in testa a ogni lezione (il blocco tra "---").
 * Regole del piano: sezione 3 (concetti) e sezione 10 (fonti).
 */
export const lessonFrontmatterSchema = z
  .object({
    id: conceptId,
    titolo: z.string().min(1),
    /** Minuti di lettura stimati. */
    durata: z.number().int().positive(),
    /** "guida-corso" = lezione sul funzionamento del corso stesso; "tecnica" = tutte le altre. */
    tipo: z.enum(['tecnica', 'guida-corso']).default('tecnica'),
    concetti_richiesti: z.array(conceptId).default([]),
    concetti_introdotti: z.array(conceptId).default([]),
    fonti: z
      .array(
        z.object({
          titolo: z.string().min(1),
          url: z.string().refine(isOfficialSource, 'la fonte non è nel registro src/content/fonti.json'),
        }),
      )
      .default([]),
    /** Data dell'ultima verifica sulla documentazione ufficiale (AAAA-MM-GG). */
    verificata_il: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((data) => data.tipo === 'guida-corso' || data.fonti.length > 0, {
    message: 'ogni lezione tecnica deve citare almeno una fonte ufficiale',
    path: ['fonti'],
  });

export type LessonFrontmatter = z.infer<typeof lessonFrontmatterSchema>;

export const glossarySchema = z.record(
  conceptId,
  z.object({
    termine: z.string().min(1),
    definizione: z.string().min(1),
  }),
);

export type Glossary = z.infer<typeof glossarySchema>;
