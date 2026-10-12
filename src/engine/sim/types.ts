/**
 * Tipi comuni del simulatore (shell + Docker).
 * Il simulatore è logica pura: niente React, niente browser. Si testa da solo.
 */

/**
 * Messaggi del simulatore stesso (non del programma simulato), mostrati nella lingua dello studente.
 * Ogni chiave ha il suo testo in src/i18n/locales/<lingua>/ui.json → terminal.hints.<chiave>.
 */
export type HintKey =
  | 'unknownCommand'
  | 'interactiveShell'
  | 'foregroundStopped'
  | 'notSimulated'
  | 'execLimited'
  | 'helpIntro'
  | 'helpFooter'
  | 'manReduced'
  | 'promptAnsweredNo';

export type OutputLine =
  | { kind: 'out' | 'err'; text: string }
  | { kind: 'hint'; key: HintKey; params?: Record<string, string> }
  /** La riga di comando digitata, con il prompt di quel momento. */
  | { kind: 'input'; prompt: string; text: string };

/** Un comando semplice eseguito (per gli obiettivi delle missioni). */
export interface ExecutedCommand {
  argv: string[];
  code: number;
}

export interface CommandOutput {
  /** Righe da mostrare prima dello stdout (es. l'avanzamento del download di un'immagine). */
  before?: OutputLine[];
  stdout: string;
  /** Righe di errore e suggerimenti, nell'ordine in cui vanno mostrati dopo lo stdout. */
  extra: OutputLine[];
  code: number;
  /** true per `clear`: svuota lo schermo. */
  clear?: boolean;
}

export function ok(stdout = ''): CommandOutput {
  return { stdout, extra: [], code: 0 };
}

export function fail(code: number, ...messages: string[]): CommandOutput {
  return { stdout: '', extra: messages.map((text) => ({ kind: 'err', text })), code };
}

export function hint(key: HintKey, params?: Record<string, string>): OutputLine {
  return params ? { kind: 'hint', key, params } : { kind: 'hint', key };
}
