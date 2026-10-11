import { describe, expect, it } from 'vitest';
import { emptyProgress, progressReducer, type ProgressAction } from './progressReducer';

// Orari a mezzogiorno UTC: il giorno locale è lo stesso in qualsiasi fuso orario europeo.
const DAY1 = '2026-10-10T12:00:00.000Z';
const DAY2 = '2026-10-11T12:00:00.000Z';

function run(actions: ProgressAction[]) {
  return actions.reduce(progressReducer, emptyProgress());
}

describe('progressReducer', () => {
  it('registra una lezione letta una sola volta e il giorno di studio', () => {
    const state = run([
      { type: 'lessonRead', lessonId: 'l1', at: DAY1 },
      { type: 'lessonRead', lessonId: 'l1', at: DAY2 },
    ]);
    expect(state.lessonsRead).toEqual({ l1: DAY1 });
    expect(state.activityDays).toEqual(['2026-10-10', '2026-10-11']);
  });

  it('assegna gli XP al primo superamento, ridotti dai suggerimenti', () => {
    const state = run([
      { type: 'missionAttempted', missionId: 'm1', at: DAY1 },
      { type: 'hintUsed', missionId: 'm1', at: DAY1 },
      { type: 'missionAttempted', missionId: 'm1', at: DAY1 },
      { type: 'missionCompleted', missionId: 'm1', baseXp: 100, at: DAY1 },
    ]);
    expect(state.missions.m1).toEqual({ completedAt: DAY1, xp: 75, hintsUsed: 1, attempts: 2 });
    expect(state.pending).toEqual({});
  });

  it('non cambia gli XP rigiocando una missione già superata', () => {
    const state = run([
      { type: 'missionCompleted', missionId: 'm1', baseXp: 100, at: DAY1 },
      { type: 'hintUsed', missionId: 'm1', at: DAY2 },
      { type: 'missionCompleted', missionId: 'm1', baseXp: 100, at: DAY2 },
    ]);
    expect(state.missions.m1?.xp).toBe(100);
    expect(state.missions.m1?.completedAt).toBe(DAY1);
  });

  it('non permette più di 3 suggerimenti', () => {
    const hint: ProgressAction = { type: 'hintUsed', missionId: 'm1', at: DAY1 };
    const state = run([hint, hint, hint, hint, hint]);
    expect(state.pending.m1?.hintsUsed).toBe(3);
  });

  it('assegna i badge appena meritati', () => {
    const state = run([
      { type: 'lessonRead', lessonId: 'l1', at: DAY1 },
      { type: 'missionCompleted', missionId: 'm1', baseXp: 50, at: DAY2 },
    ]);
    expect(state.badges).toEqual({
      'prima-lezione': DAY1,
      'prima-missione': DAY2,
      'senza-aiuti': DAY2,
    });
  });

  it('salva le bozze degli editor', () => {
    const state = run([{ type: 'draftSaved', missionId: 'm1', content: 'FROM nginx' }]);
    expect(state.drafts).toEqual({ m1: 'FROM nginx' });
  });

  it('azzera tutto', () => {
    const state = run([
      { type: 'lessonRead', lessonId: 'l1', at: DAY1 },
      { type: 'reset' },
    ]);
    expect(state).toEqual(emptyProgress());
  });

  it('restituisce lo stesso oggetto se nulla cambia', () => {
    const start = run([{ type: 'draftSaved', missionId: 'm1', content: 'x' }]);
    expect(progressReducer(start, { type: 'draftSaved', missionId: 'm1', content: 'x' })).toBe(start);
  });
});
