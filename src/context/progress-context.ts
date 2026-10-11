import { createContext } from 'react';
import type { RankInfo } from '@/engine/xp';
import type { ProgressState } from '@/types/progress';

export interface ProgressContextValue {
  progress: ProgressState;
  /** Valori calcolati dai progressi (mai salvati: si ricavano sempre dai dati). */
  totalXp: number;
  rankInfo: RankInfo;
  streak: number;
  /** false se il browser non permette di salvare (es. navigazione privata). */
  storageAvailable: boolean;

  markLessonRead: (lessonId: string) => void;
  recordAttempt: (missionId: string) => void;
  takeHint: (missionId: string) => void;
  completeMission: (missionId: string, baseXp: number) => void;
  saveDraft: (missionId: string, content: string) => void;
  importProgress: (progress: ProgressState) => void;
  resetProgress: () => void;
}

export const ProgressContext = createContext<ProgressContextValue | null>(null);
