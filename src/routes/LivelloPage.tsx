import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { LevelStatusIcon } from '@/components/mappa/LevelStatusIcon';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { isMissionOpen, useCourse } from '@/hooks/useCourse';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProgress } from '@/hooks/useProgress';
import { NotFoundPage } from './NotFoundPage';
import { paths } from './paths';

export function LivelloPage() {
  const { t } = useTranslation();
  const { livelloId = '' } = useParams();
  const { getLevel } = useCourse();
  const { progress } = useProgress();
  const level = getLevel(livelloId);
  useDocumentTitle(level?.titolo);

  if (!level) return <NotFoundPage />;

  const header = (
    <header className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400">
        {t('level.kicker', {
          level: t('map.level', { number: level.numero }),
          world: level.mondo.titolo,
        })}
      </p>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {level.titolo}
      </h1>
    </header>
  );

  if (level.status === 'locked' || level.status === 'comingSoon') {
    return (
      <div className="max-w-2xl space-y-6">
        {header}
        <p className="text-slate-600 dark:text-slate-300">
          {t(level.status === 'locked' ? 'level.lockedText' : 'level.comingSoonText')}
        </p>
        <ButtonLink to={paths.mappa} variant="secondary">
          {t('level.backToMap')}
        </ButtonLink>
      </div>
    );
  }

  const readCount = level.lessons.filter((lesson) => progress.lessonsRead[lesson.id]).length;
  const passedCount = level.missions.filter((mission) => progress.missions[mission.id]).length;
  const totalSteps = level.lessons.length + level.missions.length;
  // Primo passo ancora da fare, nell'ordine del percorso (lezione, sue missioni, lezione…).
  const nextTodo = level.steps.find((step) =>
    step.kind === 'lesson' ? !progress.lessonsRead[step.id] : !progress.missions[step.id],
  );

  return (
    <div className="max-w-3xl space-y-8">
      {header}

      <Card className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('level.progress', { read: readCount, total: level.lessons.length })}
          {level.missions.length > 0 && (
            <>
              <br />
              {t('level.missionsProgress', { passed: passedCount, total: level.missions.length })}
            </>
          )}
        </p>
        <ProgressBar
          value={totalSteps ? (readCount + passedCount) / totalSteps : 0}
          label={t('level.progressLabel')}
        />
        {level.status === 'completed' ? (
          <p className="font-semibold text-teal-700 dark:text-teal-400">{t('level.completed')}</p>
        ) : (
          nextTodo && (
            <ButtonLink to={paths.passo(level.id, nextTodo)}>
              {t(readCount + passedCount === 0 ? 'level.start' : 'level.continue')}
            </ButtonLink>
          )
        )}
      </Card>

      <section aria-labelledby="lezioni" className="space-y-3">
        <h2 id="lezioni" className="text-xl font-bold text-slate-900 dark:text-white">
          {t('level.lessonsTitle')}
        </h2>
        <ol className="space-y-2">
          {level.lessons.map((lesson, index) => {
            const read = Boolean(progress.lessonsRead[lesson.id]);
            return (
              <li key={lesson.id}>
                <Link
                  to={paths.lezione(level.id, lesson.id)}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-teal-400 dark:border-slate-800 dark:bg-slate-900"
                >
                  <LevelStatusIcon status={read ? 'completed' : 'available'} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{lesson.titolo}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {t('level.lessonMeta', {
                        number: index + 1,
                        minutes: lesson.durata,
                        status: t(read ? 'level.read' : 'level.unread'),
                      })}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {level.missions.length > 0 && (
        <section aria-labelledby="missioni" className="space-y-3">
          <h2 id="missioni" className="text-xl font-bold text-slate-900 dark:text-white">
            {t('level.missionsTitle')}
          </h2>
          <ol className="space-y-2">
            {level.missions.map((mission, index) => {
              const passed = Boolean(progress.missions[mission.id]);
              const open = isMissionOpen(mission, progress);
              const lesson = level.lessons.find((l) => l.id === mission.dopoLezione);
              const meta = t('level.missionMeta', {
                number: index + 1,
                status: passed
                  ? t('level.missionPassed', { xp: progress.missions[mission.id]?.xp ?? 0 })
                  : open
                    ? t('level.missionOpen')
                    : t('level.missionLocked', { lesson: lesson?.titolo ?? '' }),
              });
              const content = (
                <>
                  <LevelStatusIcon status={passed ? 'completed' : open ? 'available' : 'locked'} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{mission.text.titolo}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{meta}</span>
                  </span>
                </>
              );
              return (
                <li key={mission.id}>
                  {open ? (
                    <Link
                      to={paths.missione(level.id, mission.id)}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-amber-400 dark:border-slate-800 dark:bg-slate-900"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 px-4 py-3 opacity-70 dark:border-slate-700">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
