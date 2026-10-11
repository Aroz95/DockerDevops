import type { ProgressState } from '@/types/progress';

/** Valori di riferimento degli XP. Si cambiano qui per bilanciare tutto il corso. */
export const XP = {
  /** Per ogni lezione letta. */
  lesson: 10,
  /** Valore di una missione quando l'esercizio non ne indica uno. */
  missionDefault: 50,
  /** Valore di una Sfida del Boss. */
  boss: 200,
  /** Quota persa per ogni suggerimento usato (0.25 = 25%). */
  hintPenalty: 0.25,
  /** Quota minima garantita anche usando tutti i suggerimenti. */
  minMissionShare: 0.25,
} as const;

/** Suggerimenti disponibili per missione: indizio, indizio forte, soluzione commentata. */
export const MAX_HINTS = 3;

/** XP di una missione superata, ridotti dai suggerimenti usati. */
export function missionXp(baseXp: number, hintsUsed: number): number {
  const share = Math.max(XP.minMissionShare, 1 - hintsUsed * XP.hintPenalty);
  return Math.round(Math.max(0, baseXp) * share);
}

export function totalXp(state: ProgressState): number {
  const lessons = Object.keys(state.lessonsRead).length * XP.lesson;
  const missions = Object.values(state.missions).reduce((sum, mission) => sum + mission.xp, 0);
  return lessons + missions;
}

/** Gradi in ordine crescente; minXp è la soglia per raggiungerli. */
export const RANKS = [
  { id: 'mozzo', minXp: 0 },
  { id: 'marinaio', minXp: 250 },
  { id: 'timoniere', minXp: 750 },
  { id: 'capitano', minXp: 1750 },
  { id: 'ammiraglio', minXp: 3500 },
] as const;

export type RankId = (typeof RANKS)[number]['id'];

export interface RankInfo {
  rank: RankId;
  next: RankId | null;
  /** XP che mancano al grado successivo (null se il grado è il massimo). */
  xpToNext: number | null;
  /** Avanzamento verso il grado successivo, da 0 a 1 (1 se il grado è il massimo). */
  progress: number;
}

export function getRankInfo(xp: number): RankInfo {
  let index = 0;
  RANKS.forEach((rank, i) => {
    if (xp >= rank.minXp) index = i;
  });
  const current = RANKS[index] ?? RANKS[0];
  const next = RANKS[index + 1];

  if (!next) {
    return { rank: current.id, next: null, xpToNext: null, progress: 1 };
  }
  const span = next.minXp - current.minXp;
  return {
    rank: current.id,
    next: next.id,
    xpToNext: next.minXp - xp,
    progress: Math.min(1, Math.max(0, (xp - current.minXp) / span)),
  };
}
