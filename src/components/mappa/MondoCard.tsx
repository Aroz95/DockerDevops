import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import type { MondoVista } from '@/content';

interface MondoCardProps {
  mondo: MondoVista;
}

/** Un mondo nella mappa: titolo, descrizione ed elenco dei livelli. */
export function MondoCard({ mondo }: MondoCardProps) {
  const { t } = useTranslation();
  const headingId = `mondo-${mondo.id}`;

  return (
    <Card as="article" className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400">
          {t('map.worldMeta', {
            world: t('map.world', { number: mondo.numero }),
            levels: t('map.levelCount', { count: mondo.livelli.length }),
          })}
        </p>
        <h2 id={headingId} className="text-xl font-bold text-slate-900 dark:text-white">
          {mondo.titolo}
        </h2>
        <p className="text-slate-600 dark:text-slate-300">{mondo.descrizione}</p>
      </header>

      <ol aria-labelledby={headingId} className="grid gap-2 sm:grid-cols-2">
        {mondo.livelli.map((livello) => (
          <li
            key={livello.id}
            className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60"
          >
            <span className="sr-only">{t('map.level', { number: livello.numero })}</span>
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 font-mono text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200"
            >
              {livello.numero}
            </span>
            <span className="text-sm font-medium">{livello.titolo}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
