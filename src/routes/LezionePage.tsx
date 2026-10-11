import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { FontiUfficiali } from '@/components/lezione/FontiUfficiali';
import { mdxComponents } from '@/components/lezione/mdxComponents';
import { getLessonComponent } from '@/content/lessons';
import { XP } from '@/engine/xp';
import { useCourse } from '@/hooks/useCourse';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProgress } from '@/hooks/useProgress';
import { LivelloPage } from './LivelloPage';
import { NotFoundPage } from './NotFoundPage';
import { paths } from './paths';

export function LezionePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { livelloId = '', lezioneId = '' } = useParams();
  const { getLevel } = useCourse();
  const { progress, markLessonRead } = useProgress();

  const level = getLevel(livelloId);
  const index = level?.lessons.findIndex((lesson) => lesson.id === lezioneId) ?? -1;
  const lesson = index >= 0 ? level?.lessons[index] : undefined;
  useDocumentTitle(lesson?.titolo);

  if (!level || !lesson) return <NotFoundPage />;
  // Un livello bloccato mostra la sua pagina, che spiega perché non si può ancora entrare.
  if (level.status === 'locked' || level.status === 'comingSoon') return <LivelloPage />;

  const Content = getLessonComponent(lesson);
  const previous = level.lessons[index - 1];
  const next = level.lessons[index + 1];
  const alreadyRead = Boolean(progress.lessonsRead[lesson.id]);

  const levelId = level.id;
  const lessonId = lesson.id;
  function finish() {
    markLessonRead(lessonId);
    navigate(next ? paths.lezione(levelId, next.id) : paths.livello(levelId));
  }

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <Link
          to={paths.livello(level.id)}
          className="text-sm font-semibold text-teal-700 hover:underline dark:text-teal-400"
        >
          {t('lesson.backToLevel', { level: level.titolo })}
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {lesson.titolo}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('lesson.meta', {
            number: index + 1,
            total: level.lessons.length,
            minutes: lesson.durata,
          })}
        </p>
      </header>

      <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-a:text-teal-700 dark:prose-a:text-teal-400">
        <Suspense fallback={<p>{t('lesson.loading')}</p>}>
          <Content components={mdxComponents} />
        </Suspense>
      </div>

      <FontiUfficiali lesson={lesson} />

      <nav
        aria-label={t('lesson.navLabel')}
        className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 dark:border-slate-800"
      >
        {previous ? (
          <Link
            to={paths.lezione(level.id, previous.id)}
            className="text-sm font-semibold text-slate-600 hover:underline dark:text-slate-300"
          >
            {t('lesson.previous', { title: previous.titolo })}
          </Link>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={finish}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
        >
          {alreadyRead
            ? t(next ? 'lesson.nextLesson' : 'lesson.backToLevelShort')
            : t(next ? 'lesson.readAndNext' : 'lesson.readAndFinish', { xp: XP.lesson })}
        </button>
      </nav>
    </article>
  );
}
