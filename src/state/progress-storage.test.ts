import { describe, expect, it } from 'vitest';
import {
  createExport,
  loadProgress,
  parseImport,
  sanitizeProgress,
  saveProgress,
} from './progress-storage';
import { emptyProgress, progressReducer } from './progressReducer';

const AT = '2026-10-11T12:00:00.000Z';

function sampleProgress() {
  return [
    { type: 'lessonRead', lessonId: 'l1', at: AT },
    { type: 'missionCompleted', missionId: 'm1', baseXp: 50, at: AT },
  ].reduce(
    (state, action) => progressReducer(state, action as Parameters<typeof progressReducer>[1]),
    emptyProgress(),
  );
}

describe('salvataggio nel browser', () => {
  it('salva e rilegge i progressi', () => {
    const progress = sampleProgress();
    saveProgress(progress);
    expect(loadProgress()).toEqual(progress);
  });

  it('parte da zero se non c\'è nulla o i dati sono illeggibili', () => {
    expect(loadProgress()).toEqual(emptyProgress());
    window.localStorage.setItem('ddc:progress', '{rotto');
    expect(loadProgress()).toEqual(emptyProgress());
  });
});

describe('sanitizeProgress', () => {
  it('scarta solo le voci malformate e tiene le altre', () => {
    const result = sanitizeProgress({
      version: 1,
      lessonsRead: { ok: AT, rotta: 42 },
      missions: {
        ok: { completedAt: AT, xp: 50, hintsUsed: 0, attempts: 1 },
        rotta: { completedAt: AT, xp: -5, hintsUsed: 0, attempts: 1 },
      },
      activityDays: ['2026-10-11', 'non-una-data', '2026-10-11'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.progress.lessonsRead)).toEqual(['ok']);
    expect(Object.keys(result.progress.missions)).toEqual(['ok']);
    expect(result.progress.activityDays).toEqual(['2026-10-11']);
    expect(result.progress.pending).toEqual({});
  });

  it('rifiuta dati senza versione o di una versione futura', () => {
    expect(sanitizeProgress({})).toEqual({ ok: false, error: 'invalidData' });
    expect(sanitizeProgress(null)).toEqual({ ok: false, error: 'invalidData' });
    expect(sanitizeProgress({ version: 99 })).toEqual({ ok: false, error: 'newerVersion' });
  });
});

describe('esportazione e importazione', () => {
  it('un file esportato si reimporta identico', () => {
    const progress = sampleProgress();
    const file = JSON.stringify(createExport(progress, AT));
    expect(parseImport(file)).toEqual({ ok: true, progress });
  });

  it('riconosce i file sbagliati', () => {
    expect(parseImport('non è json')).toEqual({ ok: false, error: 'invalidJson' });
    expect(parseImport('{"ciao": 1}')).toEqual({ ok: false, error: 'wrongFile' });
    expect(
      parseImport(JSON.stringify({ app: 'docker-devops-corso', kind: 'progress', progress: {} })),
    ).toEqual({ ok: false, error: 'invalidData' });
  });
});
