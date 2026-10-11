import type { ProgressState } from '@/types/progress';

/** Contenuto di un livello, ridotto a ciò che serve per decidere lo sblocco. */
export interface LevelContent {
  id: string;
  lessonIds: readonly string[];
  missionIds: readonly string[];
}

/**
 * - completed: tutte le lezioni lette e tutte le missioni superate;
 * - available: si può studiare;
 * - locked: bisogna prima completare il livello precedente;
 * - comingSoon: il livello non ha ancora contenuti.
 */
export type LevelStatus = 'completed' | 'available' | 'locked' | 'comingSoon';

export function isLevelDone(level: LevelContent, progress: ProgressState): boolean {
  return (
    level.lessonIds.length > 0 &&
    level.lessonIds.every((id) => Boolean(progress.lessonsRead[id])) &&
    level.missionIds.every((id) => Boolean(progress.missions[id]))
  );
}

/**
 * Stato di ogni livello, seguendo l'ordine del corso.
 * Un livello si sblocca quando il precedente è completato; il primo è sempre aperto.
 * Un livello ancora senza contenuti blocca quelli successivi finché non viene scritto.
 */
export function levelStatuses(
  levels: readonly LevelContent[],
  progress: ProgressState,
): Record<string, LevelStatus> {
  const statuses: Record<string, LevelStatus> = {};
  let previousDone = true;

  for (const level of levels) {
    if (level.lessonIds.length === 0) {
      statuses[level.id] = 'comingSoon';
      previousDone = false;
      continue;
    }
    if (!previousDone) {
      statuses[level.id] = 'locked';
      continue;
    }
    const done = isLevelDone(level, progress);
    statuses[level.id] = done ? 'completed' : 'available';
    previousDone = done;
  }
  return statuses;
}
