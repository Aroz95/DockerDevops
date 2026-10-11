/**
 * Forma dei progressi salvati nel browser.
 *
 * Se questa struttura cambia in modo incompatibile:
 * 1. aumentare PROGRESS_SCHEMA_VERSION;
 * 2. aggiungere una migrazione in src/state/progress-storage.ts (MIGRATIONS),
 *    così i progressi già salvati dagli studenti vengono convertiti e non persi.
 */
export const PROGRESS_SCHEMA_VERSION = 1 as const;

/** Una missione superata. Il primo superamento è quello che conta per gli XP. */
export interface MissionRecord {
  /** Data e ora (ISO 8601) del superamento. */
  completedAt: string;
  /** XP ottenuti, già ridotti in base ai suggerimenti usati. */
  xp: number;
  hintsUsed: number;
  attempts: number;
}

/** Missione iniziata ma non ancora superata. */
export interface PendingMission {
  hintsUsed: number;
  attempts: number;
}

export interface ProgressState {
  version: typeof PROGRESS_SCHEMA_VERSION;
  /** id lezione → data e ora della prima lettura. */
  lessonsRead: Record<string, string>;
  /** id missione → esito del superamento. */
  missions: Record<string, MissionRecord>;
  /** id missione → suggerimenti e tentativi prima del superamento. */
  pending: Record<string, PendingMission>;
  /** id badge → data e ora in cui è stato ottenuto. */
  badges: Record<string, string>;
  /** Giorni di studio nel formato AAAA-MM-GG (ora locale), ordinati. */
  activityDays: string[];
  /** id missione → ultimo testo scritto dallo studente negli editor. */
  drafts: Record<string, string>;
}
