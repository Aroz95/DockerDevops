import { describe, expect, it } from 'vitest';
import { emptyProgress } from '@/state/progressReducer';
import { newlyEarnedBadges } from './badges';
import { nextDay, previousDay } from './dates';
import { currentStreak, longestStreak } from './streak';
import { levelStatuses } from './unlock';
import { getRankInfo, missionXp, totalXp, XP } from './xp';

describe('date', () => {
  it('gestisce cambi di mese, anno e anni bisestili', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2028-03-01')).toBe('2028-02-29');
    expect(previousDay('2026-01-01')).toBe('2025-12-31');
    expect(nextDay('2026-12-31')).toBe('2027-01-01');
  });
});

describe('serie di giorni', () => {
  it('conta i giorni consecutivi fino a oggi', () => {
    expect(currentStreak(['2026-10-09', '2026-10-10', '2026-10-11'], '2026-10-11')).toBe(3);
  });

  it('resta viva se hai studiato ieri ma non ancora oggi', () => {
    expect(currentStreak(['2026-10-09', '2026-10-10'], '2026-10-11')).toBe(2);
  });

  it('si azzera dopo un giorno saltato', () => {
    expect(currentStreak(['2026-10-08', '2026-10-09'], '2026-10-11')).toBe(0);
  });

  it('trova la serie più lunga', () => {
    const days = ['2026-01-01', '2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07'];
    expect(longestStreak(days)).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});

describe('XP', () => {
  it('riduce gli XP per ogni suggerimento, con un minimo garantito', () => {
    expect(missionXp(100, 0)).toBe(100);
    expect(missionXp(100, 1)).toBe(75);
    expect(missionXp(100, 2)).toBe(50);
    expect(missionXp(100, 3)).toBe(25);
    expect(missionXp(100, 10)).toBe(25);
  });

  it('somma lezioni e missioni', () => {
    const state = {
      ...emptyProgress(),
      lessonsRead: { a: '2026-10-11T10:00:00.000Z', b: '2026-10-11T10:00:00.000Z' },
      missions: {
        m1: { completedAt: '2026-10-11T10:00:00.000Z', xp: 40, hintsUsed: 0, attempts: 1 },
      },
    };
    expect(totalXp(state)).toBe(2 * XP.lesson + 40);
  });

  it('calcola grado e avanzamento', () => {
    expect(getRankInfo(0)).toMatchObject({ rank: 'mozzo', next: 'marinaio', xpToNext: 250, progress: 0 });
    expect(getRankInfo(125).progress).toBeCloseTo(0.5);
    expect(getRankInfo(250).rank).toBe('marinaio');
    expect(getRankInfo(99999)).toMatchObject({ rank: 'ammiraglio', next: null, xpToNext: null, progress: 1 });
  });
});

describe('sblocco dei livelli', () => {
  const levels = [
    { id: 'a', lessonIds: ['a1', 'a2'], missionIds: [] },
    { id: 'b', lessonIds: ['b1'], missionIds: ['bm'] },
    { id: 'c', lessonIds: [], missionIds: [] },
    { id: 'd', lessonIds: ['d1'], missionIds: [] },
  ];
  const read = (...ids: string[]) =>
    Object.fromEntries(ids.map((id) => [id, '2026-10-11T12:00:00.000Z']));

  it('apre solo il primo livello all\'inizio', () => {
    expect(levelStatuses(levels, emptyProgress())).toEqual({
      a: 'available',
      b: 'locked',
      c: 'comingSoon',
      d: 'locked',
    });
  });

  it('sblocca il successivo quando il precedente è completo', () => {
    const progress = { ...emptyProgress(), lessonsRead: read('a1', 'a2') };
    expect(levelStatuses(levels, progress)).toMatchObject({ a: 'completed', b: 'available' });
  });

  it('richiede anche le missioni per completare un livello', () => {
    const progress = { ...emptyProgress(), lessonsRead: read('a1', 'a2', 'b1') };
    expect(levelStatuses(levels, progress).b).toBe('available');
    const withMission = {
      ...progress,
      missions: { bm: { completedAt: '2026-10-11T12:00:00.000Z', xp: 50, hintsUsed: 0, attempts: 1 } },
    };
    expect(levelStatuses(levels, withMission).b).toBe('completed');
  });

  it('un livello senza contenuti blocca quelli dopo', () => {
    const progress = { ...emptyProgress(), lessonsRead: read('a1', 'a2', 'b1', 'd1') };
    expect(levelStatuses(levels, progress).d).toBe('locked');
  });
});

describe('badge', () => {
  it('non assegna nulla a chi inizia', () => {
    expect(newlyEarnedBadges(emptyProgress())).toEqual([]);
  });

  it('non riassegna badge già ottenuti', () => {
    const state = {
      ...emptyProgress(),
      lessonsRead: { a: '2026-10-11T10:00:00.000Z' },
      badges: { 'prima-lezione': '2026-10-11T10:00:00.000Z' },
    };
    expect(newlyEarnedBadges(state)).toEqual([]);
  });
});
