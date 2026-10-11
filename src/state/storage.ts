/**
 * Accesso sicuro a localStorage.
 *
 * Il browser può negare l'accesso (navigazione privata, spazio esaurito, cookie bloccati):
 * in quel caso il corso continua a funzionare, semplicemente senza ricordare nulla.
 * Tutte le chiavi hanno un prefisso per non scontrarsi con altri siti sullo stesso dominio
 * (su GitHub Pages più progetti condividono <utente>.github.io).
 */
export const STORAGE_PREFIX = 'ddc:';

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readJSON(key: string): unknown {
  try {
    const raw = getStorage()?.getItem(STORAGE_PREFIX + key);
    return raw == null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    getStorage()?.removeItem(STORAGE_PREFIX + key);
  } catch {
    // niente da fare: la chiave non è raggiungibile comunque
  }
}
