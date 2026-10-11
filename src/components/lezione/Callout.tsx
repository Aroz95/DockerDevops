import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type CalloutKind = 'info' | 'consiglio' | 'attenzione';

const STYLES: Record<CalloutKind, string> = {
  info: 'border-sky-400 bg-sky-50 dark:bg-sky-950/40',
  consiglio: 'border-teal-400 bg-teal-50 dark:bg-teal-950/40',
  attenzione: 'border-amber-400 bg-amber-50 dark:bg-amber-950/40',
};

const ICONS: Record<CalloutKind, string> = { info: 'ℹ️', consiglio: '💡', attenzione: '⚠️' };

/** Riquadro evidenziato dentro una lezione: <Callout tipo="attenzione">…</Callout> */
export function Callout({ tipo = 'info', children }: { tipo?: CalloutKind; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <aside className={`not-prose my-6 rounded-r-xl border-l-4 p-4 ${STYLES[tipo]}`}>
      <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
        <span aria-hidden="true">{ICONS[tipo]}</span>
        {t(`lesson.callout.${tipo}`)}
      </p>
      <div className="text-slate-700 dark:text-slate-200 [&_p]:my-1">{children}</div>
    </aside>
  );
}

/** Il paragone con la vita di tutti i giorni previsto dallo schema di ogni lezione. */
export function Analogia({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <aside className="not-prose my-6 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/40">
      <p className="mb-1 flex items-center gap-2 text-sm font-bold text-violet-900 dark:text-violet-200">
        <span aria-hidden="true">🔁</span>
        {t('lesson.analogy')}
      </p>
      <div className="text-slate-700 dark:text-slate-200 [&_p]:my-1">{children}</div>
    </aside>
  );
}
