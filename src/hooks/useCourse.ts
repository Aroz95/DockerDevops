import { useMemo } from 'react';
import { getMondi, type MondoVista } from '@/content';
import { getLessons, type Lesson } from '@/content/lessons';
import { getMissions, type Mission } from '@/content/missions';
import { levelStatuses, type LevelStatus } from '@/engine/unlock';
import type { ProgressState } from '@/types/progress';
import { useProgress } from './useProgress';
import { useSettings } from './useSettings';

/** Un passo del percorso di un livello: una lezione oppure una missione. */
export type LevelStep = { kind: 'lesson'; id: string } | { kind: 'mission'; id: string };

export interface CourseLevel {
  id: string;
  numero: number;
  titolo: string;
  mondo: MondoVista;
  lessons: Lesson[];
  missions: Mission[];
  /** Percorso consigliato: ogni lezione seguita dalle sue missioni. */
  steps: LevelStep[];
  status: LevelStatus;
}

function buildSteps(lessons: Lesson[], missions: Mission[]): LevelStep[] {
  return lessons.flatMap((lesson) => [
    { kind: 'lesson' as const, id: lesson.id },
    ...missions
      .filter((mission) => mission.dopoLezione === lesson.id)
      .map((mission) => ({ kind: 'mission' as const, id: mission.id })),
  ]);
}

/** Una missione si apre quando la lezione da cui dipende è stata letta. */
export function isMissionOpen(mission: Mission, progress: ProgressState): boolean {
  return Boolean(progress.lessonsRead[mission.dopoLezione] || progress.missions[mission.id]);
}

/** Il passo successivo da fare dopo `current`: salta le missioni già superate. */
export function nextStep(
  level: CourseLevel,
  current: LevelStep,
  progress: ProgressState,
): LevelStep | undefined {
  const index = level.steps.findIndex(
    (step) => step.kind === current.kind && step.id === current.id,
  );
  return level.steps
    .slice(index + 1)
    .find((step) => step.kind === 'lesson' || !progress.missions[step.id]);
}

/** Il corso nella lingua scelta, con lo stato di ogni livello calcolato dai progressi. */
export function useCourse() {
  const { settings } = useSettings();
  const { progress } = useProgress();

  return useMemo(() => {
    const mondi = getMondi(settings.language);
    const levels = mondi.flatMap((mondo) =>
      mondo.livelli.map((livello) => {
        const lessons = getLessons(settings.language, livello.id);
        const missions = getMissions(settings.language, livello.id);
        return { ...livello, mondo, lessons, missions, steps: buildSteps(lessons, missions) };
      }),
    );
    const statuses = levelStatuses(
      levels.map((level) => ({
        id: level.id,
        lessonIds: level.lessons.map((lesson) => lesson.id),
        missionIds: level.missions.map((mission) => mission.id),
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
