import { newlyEarnedBadges } from '@/engine/badges';
import { toLocalDay } from '@/engine/dates';
import { MAX_HINTS, missionXp } from '@/engine/xp';
import { PROGRESS_SCHEMA_VERSION, type ProgressState } from '@/types/progress';

/**
 * Tutto ciò che può cambiare i progressi.
 * `at` è la data e ora (ISO 8601) dell'azione: viene passata da fuori
 * così il reducer resta una funzione pura e facile da testare.
 */
export type ProgressAction =
  | { type: 'lessonRead'; lessonId: string; at: string }
  | { type: 'missionAttempted'; missionId: string; at: string }
  | { type: 'hintUsed'; missionId: string; at: string }
  | { type: 'missionCompleted'; missionId: string; baseXp: number; at: string }
  | { type: 'draftSaved'; missionId: string; content: string }
  | { type: 'imported'; progress: ProgressState }
  | { type: 'reset' };

export function emptyProgress(): ProgressState {
  return {
    version: PROGRESS_SCHEMA_VERSION,
    lessonsRead: {},
    missions: {},
    pending: {},
    badges: {},
    activityDays: [],
    drafts: {},
  };
}

function omit<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
}

/** Registra il giorno di studio (una volta per giorno). */
function withActivity(state: ProgressState, at: string): ProgressState {
  const day = toLocalDay(new Date(at));
  if (state.activityDays.includes(day)) return state;
  return { ...state, activityDays: [...state.activityDays, day].sort() };
}

function applyAction(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case 'lessonRead': {
      if (state.lessonsRead[action.lessonId]) return withActivity(state, action.at);
      return withActivity(
        { ...state, lessonsRead: { ...state.lessonsRead, [action.lessonId]: action.at } },
        action.at,
      );
    }

    case 'missionAttempted': {
      // Rigiocare una missione già superata non cambia nulla, se non il giorno di studio.
      if (state.missions[action.missionId]) return withActivity(state, action.at);
      const current = state.pending[action.missionId] ?? { hintsUsed: 0, attempts: 0 };
      return withActivity(
        {
          ...state,
          pending: {
            ...state.pending,
            [action.missionId]: { ...current, attempts: current.attempts + 1 },
          },
        },
        action.at,
      );
    }

    case 'hintUsed': {
      if (state.missions[action.missionId]) return state; // in replay i suggerimenti sono gratis
      const current = state.pending[action.missionId] ?? { hintsUsed: 0, attempts: 0 };
      if (current.hintsUsed >= MAX_HINTS) return state;
      return {
        ...state,
        pending: {
          ...state.pending,
          [action.missionId]: { ...current, hintsUsed: current.hintsUsed + 1 },
        },
      };
    }

    case 'missionCompleted': {
      if (state.missions[action.missionId]) return withActivity(state, action.at);
      const current = state.pending[action.missionId] ?? { hintsUsed: 0, attempts: 0 };
      return withActivity(
        {
          ...state,
          pending: omit(state.pending, action.missionId),
          missions: {
            ...state.missions,
            [action.missionId]: {
              completedAt: action.at,
              xp: missionXp(action.baseXp, current.hintsUsed),
              hintsUsed: current.hintsUsed,
              // Il tentativo riuscito conta come tentativo.
              attempts: Math.max(1, current.attempts),
            },
          },
        },
        action.at,
      );
    }

    case 'draftSaved': {
      if (state.drafts[action.missionId] === action.content) return state;
      return { ...state, drafts: { ...state.drafts, [action.missionId]: action.content } };
    }

    case 'imported':
      return action.progress;

    case 'reset':
      return emptyProgress();
  }
}

/** Assegna i badge appena meritati, con la data dell'azione che li ha sbloccati. */
function awardBadges(state: ProgressState, at: string): ProgressState {
  const earned = newlyEarnedBadges(state);
  if (earned.length === 0) return state;
  const badges = { ...state.badges };
  for (const id of earned) badges[id] = at;
  return { ...state, badges };
}

export function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  const next = applyAction(state, action);
  if (next === state || !('at' in action)) return next;
  return awardBadges(next, action.at);
}
