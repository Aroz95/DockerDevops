import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';
import type { MondoVista } from '@/content';
import type { CourseLevel } from '@/hooks/useCourse';
import { paths } from '@/routes/paths';
import { LevelStatusIcon } from './LevelStatusIcon';

interface MondoCardProps {
  mondo: MondoVista;
  levels: CourseLevel[];
}

/** Un mondo nella mappa: titolo, descrizione ed elenco dei livelli con il loro stato. */
export function MondoCard({ mondo, levels }: MondoCardProps) {
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
        {levels.map((level) => {
          const open = level.status === 'available' || level.status === 'completed';
          const content = (
            <>
              <LevelStatusIcon status={level.status} />
              <span className="min-w-0">
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {t('map.levelMeta', {
                    level: t('map.level', { number: level.numero }),
                    status: t(`map.status.${level.status}`),
                  })}
                </span>
                <span className="block text-sm font-medium">{level.titolo}</span>
              </span>
            </>
          );
          return (
            <li key={level.id}>
              {open ? (
                <Link
                  to={paths.livello(level.id)}
                  className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 transition-colors hover:bg-teal-50 dark:bg-slate-800/60 dark:hover:bg-teal-950/50"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-3 rounded-lg px-3 py-2 opacity-70">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
