import type { Machine } from './machine';
import { HOME, resolvePath } from './path';
import { parseImageRef } from './docker/catalog';

/**
 * Obiettivi di una missione nel terminale: condizioni sullo stato finale della macchina.
 * Si controlla il risultato, non il testo esatto digitato: più strade corrette sono accettate.
 */
export type Goal =
  | { tipo: 'cartella-corrente'; percorso: string }
  | { tipo: 'esiste'; percorso: string; come?: 'cartella' | 'file' }
  | { tipo: 'non-esiste'; percorso: string }
  | { tipo: 'file-contiene'; percorso: string; testo: string }
  /**
   * Un comando eseguito con successo.
   * - argomenti: parole che devono comparire tra gli argomenti;
   * - opzioni: opzioni da usare, scritte come "a" o "a|all": vale -a, -la (opzioni unite) oppure --all.
   */
  | { tipo: 'comando-eseguito'; programma: string; argomenti?: string[]; opzioni?: string[] }
  /** Basta raggiungere uno degli obiettivi elencati (più strade corrette). */
  | { tipo: 'uno-tra'; obiettivi: Goal[] }
  | { tipo: 'immagine-presente'; immagine: string }
  | { tipo: 'immagine-assente'; immagine: string }
  | {
      tipo: 'container';
      immagine?: string;
      nome?: string;
      stato?: 'running' | 'exited' | 'created';
      /** "8080:80" = porta 8080 del computer collegata alla 80 del container. */
      porta?: string;
      /** Quanti container devono soddisfare la condizione (predefinito: almeno 1). */
      minimo?: number;
    }
  | { tipo: 'nessun-container'; immagine?: string; stato?: 'running' | 'exited' | 'created' };

/** "a|all": vero se tra gli argomenti c'è -a, un gruppo come -la, oppure --all. */
function hasOption(args: string[], wanted: string): boolean {
  const [short = '', long] = wanted.split('|');
  return args.some(
    (arg) =>
      (short.length === 1 && /^-[^-]/.test(arg) && arg.slice(1).includes(short)) ||
      (long !== undefined && arg === `--${long}`),
  );
}

export function checkGoal(goal: Goal, machine: Machine): boolean {
  machine.docker.refresh();
  switch (goal.tipo) {
    case 'cartella-corrente':
      return machine.cwd === resolvePath(HOME, goal.percorso);
    case 'esiste': {
      const node = machine.fs.get(resolvePath(HOME, goal.percorso));
      if (!node) return false;
      if (goal.come === 'cartella') return node.type === 'dir';
      if (goal.come === 'file') return node.type === 'file';
      return true;
    }
    case 'non-esiste':
      return !machine.fs.get(resolvePath(HOME, goal.percorso));
    case 'file-contiene': {
      const node = machine.fs.get(resolvePath(HOME, goal.percorso));
      return node?.type === 'file' && node.content.includes(goal.testo);
    }
    case 'comando-eseguito':
      return machine.executed.some(
        ({ argv, code }) =>
          code === 0 &&
          argv[0] === goal.programma &&
          (goal.argomenti ?? []).every((wanted) => argv.slice(1).includes(wanted)) &&
          (goal.opzioni ?? []).every((wanted) => hasOption(argv.slice(1), wanted)),
      );
    case 'uno-tra':
      return goal.obiettivi.some((alternative) => checkGoal(alternative, machine));
    case 'immagine-presente':
      return Boolean(machine.docker.findImage(goal.immagine));
    case 'immagine-assente':
      return !machine.docker.findImage(goal.immagine);
    case 'container': {
      const matching = machine.docker.containers.filter((c) => {
        if (goal.immagine && c.image.repo !== parseImageRef(goal.immagine).repo) return false;
        if (goal.nome && c.name !== goal.nome) return false;
        if (goal.stato && c.state !== goal.stato) return false;
        if (goal.porta) {
          const [host, port] = goal.porta.split(':');
          if (!c.ports.some((p) => p.host === host && p.container.split('/')[0] === port)) return false;
        }
        return true;
      });
      return matching.length >= (goal.minimo ?? 1);
    }
    case 'nessun-container':
      return !machine.docker.containers.some(
        (c) =>
          (!goal.immagine || c.image.repo === parseImageRef(goal.immagine).repo) &&
          (!goal.stato || c.state === goal.stato),
      );
  }
}

export function checkGoals(goals: readonly Goal[], machine: Machine): boolean[] {
  return goals.map((goal) => checkGoal(goal, machine));
}
