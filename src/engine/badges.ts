import type { ProgressState } from '@/types/progress';
import { longestStreak } from './streak';

/**
 * Elenco dei badge. Per aggiungerne uno:
 * 1. aggiungere l'id qui sotto e la sua condizione in BADGE_RULES;
 * 2. aggiungere nome e descrizione in src/i18n/locales/<lingua>/ui.json (badges.<id>);
 * 3. aggiungere l'icona in BADGE_ICONS.
 */
export const BADGE_IDS = [
  'prima-lezione',
  'prima-missione',
  'senza-aiuti',
  'perseverante',
  'serie-7',
] as const;

export type BadgeId = (typeof BADGE_IDS)[number];

const BADGE_RULES: Record<BadgeId, (state: ProgressState) => boolean> = {
  'prima-lezione': (s) => Object.keys(s.lessonsRead).length >= 1,
  'prima-missione': (s) => Object.keys(s.missions).length >= 1,
  'senza-aiuti': (s) => Object.values(s.missions).some((m) => m.hintsUsed === 0),
  perseverante: (s) => Object.values(s.missions).some((m) => m.attempts >= 5),
  'serie-7': (s) => longestStreak(s.activityDays) >= 7,
};

export const BADGE_ICONS: Record<BadgeId, string> = {
  'prima-lezione': '📘',
  'prima-missione': '🚢',
  'senza-aiuti': '🧭',
  perseverante: '💪',
  'serie-7': '🔥',
};

export function isBadgeId(value: string): value is BadgeId {
  return (BADGE_IDS as readonly string[]).includes(value);
}

/** Badge che lo stato merita ma non sono ancora stati assegnati. */
export function newlyEarnedBadges(state: ProgressState): BadgeId[] {
  return BADGE_IDS.filter((id) => !state.badges[id] && BADGE_RULES[id](state));
}
