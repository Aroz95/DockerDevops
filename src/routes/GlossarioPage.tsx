import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { getGlossaryEntries } from '@/content/glossary';
import { useCourse } from '@/hooks/useCourse';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSettings } from '@/hooks/useSettings';
import { paths } from './paths';

export function GlossarioPage() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { getLevel } = useCourse();
  const { hash } = useLocation();
  useDocumentTitle(t('glossary.title'));

  const entries = useMemo(() => getGlossaryEntries(settings.language), [settings.language]);

  // /glossario#cloud porta direttamente alla voce "cloud".
  useEffect(() => {
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    if (id) document.getElementById(`termine-${id}`)?.scrollIntoView?.({ block: 'start' });
  }, [hash]);

  return (
    <div className="max-w-3xl space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t('glossary.title')}
        </h1>
        <p className="text-slate-600 dark:text-slate-300">{t('glossary.intro')}</p>
      </header>

      {entries.length === 0 ? (
        <p className="text-slate-600 dark:text-slate-300">{t('glossary.empty')}</p>
      ) : (
        <dl className="space-y-4">
          {entries.map((entry) => {
            const lesson = entry.introducedIn;
            const level = lesson ? getLevel(lesson.levelId) : undefined;
            const reachable = level && (level.status === 'available' || level.status === 'completed');
            return (
              <div
                key={entry.id}
                id={`termine-${entry.id}`}
                className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-4 target:border-teal-400 dark:border-slate-800 dark:bg-slate-900"
              >
                <dt className="font-bold text-slate-900 dark:text-white">{entry.termine}</dt>
                <dd className="mt-1 space-y-2 text-slate-700 dark:text-slate-200">
                  <p>{entry.definizione}</p>
                  {lesson && reachable && (
                    <Link
                      to={paths.lezione(lesson.levelId, lesson.id)}
                      className="text-sm font-semibold text-teal-700 underline dark:text-teal-400"
                    >
                      {t('glossary.introducedIn', { lesson: lesson.titolo })}
                    </Link>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}
