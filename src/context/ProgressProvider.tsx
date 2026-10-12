import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { toLocalDay } from '@/engine/dates';
import { currentStreak } from '@/engine/streak';
import { getRankInfo, totalXp } from '@/engine/xp';
import { saveProgress } from '@/state/progress-storage';
import { progressReducer } from '@/state/progressReducer';
import type { ProgressState } from '@/types/progress';
import { ProgressContext, type ProgressContextValue } from './progress-context';

interface ProgressProviderProps {
  initialProgress: ProgressState;
  children: ReactNode;
}

const now = () => new Date().toISOString();

/** Progressi dello studente: li rende disponibili a tutta l'app e li salva a ogni modifica. */
export function ProgressProvider({ initialProgress, children }: ProgressProviderProps) {
  const [progress, dispatch] = useReducer(progressReducer, initialProgress);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    setStorageAvailable(saveProgress(progress));
  }, [progress]);

  const markLessonRead = useCallback(
    (lessonId: string) => dispatch({ type: 'lessonRead', lessonId, at: now() }),
    [],
  );
  const recordAttempt = useCallback(
    (missionId: string) => dispatch({ type: 'missionAttempted', missionId, at: now() }),
    [],
  );
  const takeHint = useCallback(
    (missionId: string) => dispatch({ type: 'hintUsed', missionId, at: now() }),
    [],
  );
  const completeMission = useCallback(
    (missionId: string, baseXp: number) =>
      dispatch({ type: 'missionCompleted', missionId, baseXp, at: now() }),
    [],
  );
  const saveDraft = useCallback(
    (missionId: string, content: string) => dispatch({ type: 'draftSaved', missionId, content }),
    [],
  );
  const markLevelCompleted = useCallback(
    (levelId: string) => dispatch({ type: 'levelCompleted', levelId, at: now() }),
    [],
  );
  const importProgress = useCallback(
    (imported: ProgressState) => dispatch({ type: 'imported', progress: imported }),
    [],
  );
  const resetProgress = useCallback(() => dispatch({ type: 'reset' }), []);

  const value = useMemo<ProgressContextValue>(() => {
    const xp = totalXp(progress);
    return {
      progress,
      totalXp: xp,
      rankInfo: getRankInfo(xp),
      streak: currentStreak(progress.activityDays, toLocalDay(new Date())),
      storageAvailable,
      markLessonRead,
      recordAttempt,
      takeHint,
      completeMission,
      saveDraft,
      markLevelCompleted,
      importProgress,
      resetProgress,
    };
  }, [
    progress,
    storageAvailable,
    markLessonRead,
    recordAttempt,
    takeHint,
    completeMission,
    saveDraft,
    markLevelCompleted,
    importProgress,
    resetProgress,
  ]);

  return <ProgressContext value={value}>{children}</ProgressContext>;
}
