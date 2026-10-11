import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { getGlossaryEntry } from '@/content/glossary';
import { useSettings } from '@/hooks/useSettings';
import { paths } from '@/routes/paths';

interface TermineProps {
  /** id del concetto nel glossario. */
  id: string;
  /** Testo mostrato nella frase (se manca, si usa il termine del glossario). */
  children?: ReactNode;
}

/**
 * Parola del glossario dentro una lezione: <Termine id="cloud">cloud</Termine>.
 * Toccandola si apre la definizione, con il collegamento alla lezione che la spiega.
 */
export function Termine({ id, children }: TermineProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapper = useRef<HTMLSpanElement>(null);
  const entry = getGlossaryEntry(settings.language, id);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event instanceof MouseEvent && wrapper.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('mousedown', close);
    };
  }, [open]);

  // Un id sconosciuto non deve rompere la lezione: si mostra il testo normale.
  if (!entry) return <>{children}</>;

  const lesson = entry.introducedIn;

  return (
    <span ref={wrapper} className="relative inline">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="cursor-help font-medium text-inherit underline decoration-teal-500 decoration-dotted decoration-2 underline-offset-4"
      >
        {children ?? entry.termine}
      </button>
      {open && (
        <span
          id={panelId}
          role="note"
          className="absolute left-0 top-full z-20 mt-2 block w-72 max-w-[80vw] rounded-xl border border-slate-200 bg-white p-4 text-left text-sm font-normal shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <span className="mb-1 block font-bold text-slate-900 dark:text-white">{entry.termine}</span>
          <span className="block text-slate-700 dark:text-slate-200">{entry.definizione}</span>
          <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {lesson && (
              <Link
                to={paths.lezione(lesson.levelId, lesson.id)}
                className="font-semibold text-teal-700 underline dark:text-teal-400"
              >
                {t('glossary.goToLesson')}
              </Link>
            )}
            <Link to={paths.termine(id)} className="font-semibold text-teal-700 underline dark:text-teal-400">
              {t('glossary.openGlossary')}
            </Link>
          </span>
        </span>
      )}
    </span>
  );
}
