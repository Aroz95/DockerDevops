import { checkGoals, type Goal } from './sim/goals';
import type { Machine } from './sim/machine';

/**
 * Verificatori delle missioni: funzioni pure che confrontano la risposta dello studente
 * con quella attesa e restituiscono un esito dettagliato, da cui l'interfaccia costruisce
 * il feedback (cosa è corretto, cosa manca, perché).
 */

export interface ChoiceEvaluation {
  tipo: 'scelta';
  passed: boolean;
  selected: string | null;
}

export interface MultipleChoiceEvaluation {
  tipo: 'scelta-multipla';
  passed: boolean;
  /** Opzioni giuste che lo studente ha selezionato. */
  rightSelected: string[];
  /** Opzioni sbagliate che lo studente ha selezionato. */
  wrongSelected: string[];
  /** Quante opzioni giuste mancano. */
  missing: number;
}

export interface OrderEvaluation {
  tipo: 'ordina';
  passed: boolean;
  /** Per ogni posizione: l'elemento è al posto giusto? */
  correctAt: boolean[];
}

export interface FillEvaluation {
  tipo: 'completa';
  passed: boolean;
  /** Per ogni spazio da completare: la risposta è accettata? */
  blanks: boolean[];
}

export interface TerminalEvaluation {
  tipo: 'terminale';
  passed: boolean;
  /** Per ogni obiettivo: è stato raggiunto? */
  goals: boolean[];
}

export type Evaluation =
  | ChoiceEvaluation
  | MultipleChoiceEvaluation
  | OrderEvaluation
  | FillEvaluation
  | TerminalEvaluation;

/** Missione nel terminale: si controlla lo stato finale della macchina simulata. */
export function checkTerminal(goals: readonly Goal[], machine: Machine): TerminalEvaluation {
  const results = checkGoals(goals, machine);
  return { tipo: 'terminale', passed: results.every(Boolean), goals: results };
}

export function checkChoice(selected: string | null, correct: string): ChoiceEvaluation {
  return { tipo: 'scelta', passed: selected === correct, selected };
}

export function checkMultipleChoice(
  selected: readonly string[],
  correct: readonly string[],
): MultipleChoiceEvaluation {
  const rightSelected = selected.filter((id) => correct.includes(id));
  const wrongSelected = selected.filter((id) => !correct.includes(id));
  const missing = correct.length - rightSelected.length;
  return {
    tipo: 'scelta-multipla',
    passed: wrongSelected.length === 0 && missing === 0,
    rightSelected,
    wrongSelected,
    missing,
  };
}

export function checkOrder(order: readonly string[], correct: readonly string[]): OrderEvaluation {
  const correctAt = correct.map((id, index) => order[index] === id);
  return {
    tipo: 'ordina',
    passed: order.length === correct.length && correctAt.every(Boolean),
    correctAt,
  };
}

/** Spazi iniziali e finali tolti, spazi multipli ridotti a uno solo. */
export function normalizeAnswer(value: string, ignoreCase: boolean): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return ignoreCase ? trimmed.toLowerCase() : trimmed;
}

/**
 * @param accepted per ogni spazio, l'elenco delle risposte accettate
 * @param ignoreCase true per le parole normali; false per i comandi, dove maiuscole e minuscole contano
 */
export function checkFill(
  answers: readonly string[],
  accepted: readonly (readonly string[])[],
  ignoreCase: boolean,
): FillEvaluation {
  const blanks = accepted.map((options, index) => {
    const given = normalizeAnswer(answers[index] ?? '', ignoreCase);
    return given !== '' && options.some((option) => normalizeAnswer(option, ignoreCase) === given);
  });
  return { tipo: 'completa', passed: blanks.every(Boolean), blanks };
}

/**
 * Mescola in modo ripetibile: lo stesso seme dà sempre lo stesso ordine.
 * Serve per gli esercizi "ordina": l'ordine iniziale non deve essere quello giusto,
 * ma deve restare uguale ricaricando la pagina.
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let state = 0;
  for (const char of seed) state = (state * 31 + char.charCodeAt(0)) >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  // Se per caso l'ordine mescolato è quello giusto, si ruota di una posizione.
  if (result.length > 1 && result.every((item, index) => item === items[index])) {
    result.push(result.shift() as T);
  }
  return result;
}
