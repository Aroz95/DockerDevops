import { nextDay, previousDay } from './dates';

/**
 * Giorni di studio consecutivi fino a oggi.
 * Se oggi non hai ancora studiato ma ieri sì, la serie è ancora viva:
 * conta fino a ieri, così non si "perde" la serie appena si apre il sito al mattino.
 */
export function currentStreak(days: readonly string[], today: string): number {
  const studied = new Set(days);
  let cursor = studied.has(today) ? today : previousDay(today);
  let count = 0;
  while (studied.has(cursor)) {
    count++;
    cursor = previousDay(cursor);
  }
  return count;
}

/** La serie più lunga mai raggiunta. */
export function longestStreak(days: readonly string[]): number {
  const studied = new Set(days);
  let best = 0;
  for (const day of studied) {
    // Si conta solo partendo dal primo giorno di ogni serie.
    if (studied.has(previousDay(day))) continue;
    let length = 0;
    let cursor = day;
    while (studied.has(cursor)) {
      length++;
      cursor = nextDay(cursor);
    }
    best = Math.max(best, length);
  }
  return best;
}
