import { useEffect } from 'react';
import { isLevelDone } from '@/engine/unlock';
import { useCourse } from './useCourse';
import { useProgress } from './useProgress';

/**
 * Registra nei progressi i livelli appena completati, così restano completati
 * anche se in futuro vi si aggiungono lezioni o missioni.
 */
export function useRecordCompletedLevels(): void {
  const { levels } = useCourse();
  const { progress, markLevelCompleted } = useProgress();

  useEffect(() => {
    for (const level of levels) {
      if (progress.levelsCompleted[level.id]) continue;
      const content = {
        id: level.id,
        lessonIds: level.lessons.map((lesson) => lesson.id),
        missionIds: level.missions.map((mission) => mission.id),
      };
      if (isLevelDone(content, progress)) markLevelCompleted(level.id);
    }
  }, [levels, progress, markLevelCompleted]);
}
