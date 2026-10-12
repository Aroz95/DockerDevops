import { z } from 'zod';
import type { Goal } from '@/engine/sim/goals';

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id: minuscolo-con-trattini');

/**
 * LOGICA di una missione: uguale in tutte le lingue.
 * File: src/content/esercizi/<id-livello>.json
 */
const base = {
  id,
  /** La missione si apre dopo aver letto questa lezione (id della lezione). */
  dopoLezione: id,
  /** XP della missione; se assente si usa il valore predefinito (engine/xp.ts). */
  xp: z.number().int().positive().optional(),
};

const path = z.string().min(1);
const containerState = z.enum(['running', 'exited', 'created']);

/** Obiettivi delle missioni nel terminale (vedi src/engine/sim/goals.ts). */
const goalSchema: z.ZodType<Goal> = z.lazy(() =>
  z.discriminatedUnion('tipo', [
    z.object({ tipo: z.literal('cartella-corrente'), percorso: path }),
    z.object({ tipo: z.literal('esiste'), percorso: path, come: z.enum(['cartella', 'file']).optional() }),
    z.object({ tipo: z.literal('non-esiste'), percorso: path }),
    z.object({ tipo: z.literal('file-contiene'), percorso: path, testo: z.string().min(1) }),
    z.object({
      tipo: z.literal('comando-eseguito'),
      programma: z.string().min(1),
      argomenti: z.array(z.string()).optional(),
      opzioni: z.array(z.string().regex(/^[A-Za-z0-9](\|[a-z0-9-]+)?$/)).optional(),
    }),
    z.object({ tipo: z.literal('uno-tra'), obiettivi: z.array(goalSchema).min(2) }),
    z.object({ tipo: z.literal('immagine-presente'), immagine: z.string().min(1) }),
    z.object({ tipo: z.literal('immagine-assente'), immagine: z.string().min(1) }),
    z.object({
      tipo: z.literal('container'),
      immagine: z.string().optional(),
      nome: z.string().optional(),
      stato: containerState.optional(),
      porta: z.string().regex(/^\d+:\d+$/).optional(),
      minimo: z.number().int().positive().optional(),
    }),
    z.object({
      tipo: z.literal('nessun-container'),
      immagine: z.string().optional(),
      stato: containerState.optional(),
    }),
  ]),
);

/** Stato iniziale della macchina simulata (vedi MachineSetup in src/engine/sim/machine.ts). */
const machineSetupSchema = z.object({
  cartella: z.string().optional(),
  cartelle: z.array(path).optional(),
  file: z.record(z.string(), z.string()).optional(),
  immagini: z.array(z.string()).optional(),
});

export const missionLogicSchema = z.discriminatedUnion('tipo', [
  z.object({ ...base, tipo: z.literal('scelta'), opzioni: z.array(id).min(2), corretta: id }),
  z.object({
    ...base,
    tipo: z.literal('scelta-multipla'),
    opzioni: z.array(id).min(2),
    corrette: z.array(id).min(1),
  }),
  /** `elementi` è l'ordine giusto; lo studente li vede mescolati. */
  z.object({ ...base, tipo: z.literal('ordina'), elementi: z.array(id).min(2) }),
  z.object({
    ...base,
    tipo: z.literal('completa'),
    /** Per ogni spazio "___" del testo, le risposte accettate. */
    risposte: z.array(z.array(z.string().min(1)).min(1)).min(1),
    /** true per parole normali; false (predefinito) per comandi, dove le maiuscole contano. */
    ignoraMaiuscole: z.boolean().default(false),
  }),
  /** Esercizio nel terminale simulato: si supera raggiungendo tutti gli obiettivi. */
  z.object({
    ...base,
    tipo: z.literal('terminale'),
    inizio: machineSetupSchema.default({}),
    obiettivi: z.array(goalSchema).min(1),
  }),
]);

export const missionLogicFileSchema = z.object({ missioni: z.array(missionLogicSchema) });

export type MissionLogic = z.infer<typeof missionLogicSchema>;

/**
 * TESTI di una missione, per lingua.
 * File: src/content/<lingua>/esercizi/<id-livello>.json, chiave = id della missione.
 */
export const missionTextSchema = z.object({
  titolo: z.string().min(1),
  domanda: z.string().min(1),
  /** Da 1 a 3 suggerimenti, dal più leggero alla soluzione spiegata. */
  suggerimenti: z.array(z.string().min(1)).min(1).max(3),
  /** Mostrata a missione superata: perché la risposta è quella. */
  spiegazione: z.string().min(1),
  /** scelta / scelta-multipla: testo di ogni opzione. ordina: testo di ogni elemento. */
  opzioni: z.record(id, z.string().min(1)).optional(),
  /** Spiegazione mostrata quando si sceglie un'opzione sbagliata. */
  feedback: z.record(id, z.string().min(1)).optional(),
  /** completa: frase con uno o più "___" da riempire. */
  modello: z.string().optional(),
  /** completa: suggerimento mostrato per ogni spazio sbagliato (stesso ordine degli spazi). */
  feedbackSpazi: z.array(z.string()).optional(),
  /** terminale: descrizione di ogni obiettivo (stesso ordine degli obiettivi della logica). */
  obiettivi: z.array(z.string().min(1)).optional(),
});

export const missionTextFileSchema = z.record(id, missionTextSchema);

export type MissionText = z.infer<typeof missionTextSchema>;

export const BLANK = '___';
