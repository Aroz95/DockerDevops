export const HOME = '/home/studente';
export const USER = 'studente';
export const HOSTNAME = 'corso';

/** Trasforma un percorso (assoluto, relativo, con ~ . ..) in un percorso assoluto normalizzato. */
export function resolvePath(cwd: string, input: string, home = HOME): string {
  let path = input;
  if (path === '~') path = home;
  else if (path.startsWith('~/')) path = home + path.slice(1);
  const full = path.startsWith('/') ? path : `${cwd}/${path}`;
  const parts: string[] = [];
  for (const part of full.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return `/${parts.join('/')}`;
}

export function dirname(path: string): string {
  const index = path.lastIndexOf('/');
  return index <= 0 ? '/' : path.slice(0, index);
}

export function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Percorso come lo mostra il prompt: la cartella personale diventa ~. */
export function displayPath(path: string, home = HOME): string {
  if (path === home) return '~';
  if (path.startsWith(`${home}/`)) return `~${path.slice(home.length)}`;
  return path;
}
