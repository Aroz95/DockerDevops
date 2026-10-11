import { useTranslation } from 'react-i18next';
import type { Lesson } from '@/content/lessons';

/** Riquadro "Approfondisci nella documentazione ufficiale" a fine lezione (piano, regola 3.7). */
export function FontiUfficiali({ lesson }: { lesson: Lesson }) {
  const { t, i18n } = useTranslation();
  const verifiedOn = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(
    new Date(`${lesson.verificata_il}T12:00:00`),
  );

  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      {lesson.fonti.length > 0 && (
        <>
          <h2 className="mb-2 font-bold text-slate-900 dark:text-white">{t('lesson.sources.title')}</h2>
          <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
            {lesson.fonti.map((fonte) => (
              <li key={fonte.url}>
                <a
                  href={fonte.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-teal-700 underline dark:text-teal-400"
                >
                  {fonte.titolo}
                </a>
                {lesson.language !== 'en' && (
                  <span className="text-slate-500 dark:text-slate-400">
                    {t('lesson.sources.inEnglish')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('lesson.sources.verified', { date: verifiedOn })}
      </p>
    </aside>
  );
}
