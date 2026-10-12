import {
  PROGRESS_SCHEMA_VERSION,
  type MissionRecord,
  type PendingMission,
  type ProgressState,
} from '@/types/progress';
import { emptyProgress } from './progressReducer';
import { readJSON, writeJSON } from './storage';

/** Chiave in localStorage (con prefisso "ddc:"). */
export const PROGRESS_KEY = 'progress';

/** Identifica i file di esportazione di questo corso. */
export const EXPORT_APP_ID = 'docker-devops-corso';

/**
 * Migrazioni tra versioni dello schema: MIGRATIONS[n] converte dati della versione n
 * nella versione n + 1.
 */
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 → v2: nasce l'elenco dei livelli completati. Viene riempito dall'app al primo avvio,
  // controllando quali livelli lo studente ha già finito.
  1: (data) => ({ ...data, version: 2, levelsCompleted: {} }),
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** Tiene solo le voci il cui valore supera il controllo; scarta il resto senza errori. */
function filterRecord<T>(value: unknown, check: (item: unknown) => item is T): Record<string, T> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, item]) => check(item))) as Record<
    string,
    T
  >;
}

const isString = (value: unknown): value is string => typeof value === 'string';

const isMissionRecord = (value: unknown): value is MissionRecord =>
  isRecord(value) &&
  isString(value.completedAt) &&
  isCount(value.xp) &&
  isCount(value.hintsUsed) &&
  isCount(value.attempts);

const isPendingMission = (value: unknown): value is PendingMission =>
  isRecord(value) && isCount(value.hintsUsed) && isCount(value.attempts);

const isDay = (value: unknown): value is string =>
  isString(value) && /^\d{4}-\d{2}-\d{2}$/.test(value);

export type SanitizeResult =
  | { ok: true; progress: ProgressState }
  | { ok: false; error: 'invalidData' | 'newerVersion' };

/**
 * Converte dati sconosciuti (localStorage o file importato) in progressi validi.
 * Le voci malformate vengono scartate una per una, così un piccolo danno non fa perdere tutto.
 */
export function sanitizeProgress(raw: unknown): SanitizeResult {
  if (!isRecord(raw) || !isCount(raw.version) || raw.version < 1) {
    return { ok: false, error: 'invalidData' };
  }
  if (raw.version > PROGRESS_SCHEMA_VERSION) return { ok: false, error: 'newerVersion' };

  let data: UnknownRecord = raw;
  for (let version = raw.version; version < PROGRESS_SCHEMA_VERSION; version++) {
    const migrate = MIGRATIONS[version];
    if (!migrate) return { ok: false, error: 'invalidData' };
    data = migrate(data);
  }

  const days = Array.isArray(data.activityDays) ? data.activityDays.filter(isDay) : [];

  return {
    ok: true,
    progress: {
      version: PROGRESS_SCHEMA_VERSION,
      lessonsRead: filterRecord(data.lessonsRead, isString),
      missions: filterRecord(data.missions, isMissionRecord),
      pending: filterRecord(data.pending, isPendingMission),
      badges: filterRecord(data.badges, isString),
      activityDays: [...new Set(days)].sort(),
      drafts: filterRecord(data.drafts, isString),
      levelsCompleted: filterRecord(data.levelsCompleted, isString),
    },
  };
}

export function loadProgress(): ProgressState {
  const result = sanitizeProgress(readJSON(PROGRESS_KEY));
  return result.ok ? result.progress : emptyProgress();
}

export function saveProgress(progress: ProgressState): boolean {
  return writeJSON(PROGRESS_KEY, progress);
}

// --- Esportazione e importazione ---------------------------------------------------------

export interface ProgressExport {
  app: typeof EXPORT_APP_ID;
  kind: 'progress';
  exportedAt: string;
  progress: ProgressState;
}

export function createExport(progress: ProgressState, at: string): ProgressExport {
  return { app: EXPORT_APP_ID, kind: 'progress', exportedAt: at, progress };
}

export function exportFileName(day: string): string {
  return `docker-devops-progressi-${day}.json`;
}

export type ImportError = 'invalidJson' | 'wrongFile' | 'invalidData' | 'newerVersion';

export type ImportResult = { ok: true; progress: ProgressState } | { ok: false; error: ImportError };

export function parseImport(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalidJson' };
  }
  if (!isRecord(parsed) || parsed.app !== EXPORT_APP_ID || parsed.kind !== 'progress') {
    return { ok: false, error: 'wrongFile' };
  }
  return sanitizeProgress(parsed.progress);
}
