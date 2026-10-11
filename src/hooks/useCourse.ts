import { useMemo } from 'react';
import { getMondi, type MondoVista } from '@/content';
import { getLessons, type Lesson } from '@/content/lessons';
import { levelStatuses, type LevelStatus } from '@/engine/unlock';
import { useProgress } from './useProgress';
import { useSettings } from './useSettings';

export interface CourseLevel {
  id: string;
  numero: number;
  titolo: string;
  mondo: MondoVista;
  lessons: Lesson[];
  status: LevelStatus;
}

/** Il corso nella lingua scelta, con lo stato di ogni livello calcolato dai progressi. */
export function useCourse() {
  const { settings } = useSettings();
  const { progress } = useProgress();

  return useMemo(() => {
    const mondi = getMondi(settings.language);
    const levels = mondi.flatMap((mondo) =>
      mondo.livelli.map((livello) => ({
        ...livello,
        mondo,
        lessons: getLessons(settings.language, livello.id),
      })),
    );
    const statuses = levelStatuses(
      levels.map((level) => ({
        id: level.id,
        lessonIds: level.lessons.map((lesson) => lesson.id),
        missionIds: [], // le missioni arrivano con il motore degli esercizi
      })),
      progress,
    );
    const courseLevels: CourseLevel[] = levels.map((level) => ({
      ...level,
      status: statuses[level.id] ?? 'comingSoon',
    }));
    const byId = new Map(courseLevels.map((level) => [level.id, level]));
    return { mondi, levels: courseLevels, getLevel: (id: string) => byId.get(id) };
  }, [settings.language, progress]);
}
