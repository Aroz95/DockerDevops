import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { MissionRenderer } from '@/components/esercizi/MissionRenderer';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { isMissionOpen, nextStep, useCourse } from '@/hooks/useCourse';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProgress } from '@/hooks/useProgress';
import { LivelloPage } from './LivelloPage';
import { NotFoundPage } from './NotFoundPage';
import { paths } from './paths';

export function MissionePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { livelloId = '', missioneId = '' } = useParams();
  const { getLevel } = useCourse();
  const { progress } = useProgress();

  const level = getLevel(livelloId);
  const mission = level?.missions.find((m) => m.id === missioneId);
  useDocumentTitle(mission?.text.titolo);

  if (!level || !mission) return <NotFoundPage />;
  if (level.status === 'locked' || level.status === 'comingSoon') return <LivelloPage />;

  const lesson = level.lessons.find((l) => l.id === mission.dopoLezione);
  const number = level.missions.indexOf(mission) + 1;

  const header = (
    <header className="space-y-2">
      <Link
        to={paths.livello(level.id)}
        className="text-sm font-semibold text-teal-700 hover:underline dark:text-teal-400"
      >
        {t('lesson.backToLevel', { level: level.titolo })}
      </Link>
      <p className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
        {t('mission.kicker', { number, total: level.missions.length })}
      </p>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {mission.text.titolo}
      </h1>
    </header>
  );

  if (!isMissionOpen(mission, progress)) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {header}
        <p className="text-slate-600 dark:text-slate-300">
          {t('mission.lockedText', { lesson: lesson?.titolo ?? '' })}
        </p>
        {lesson && (
          <ButtonLink to={paths.lezione(level.id, lesson.id)}>{t('mission.goToLesson')}</ButtonLink>
        )}
      </div>
    );
  }

  const next = nextStep(level, { kind: 'mission', id: mission.id }, progress);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {header}
      <MissionRenderer
        key={mission.id}
        mission={mission}
        continueLabel={t(next ? 'mission.continue' : 'lesson.backToLevelShort')}
        onContinue={() => navigate(next ? paths.passo(level.id, next) : paths.livello(level.id))}
      />
    </div>
  );
}
