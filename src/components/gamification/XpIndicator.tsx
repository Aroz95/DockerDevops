import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useProgress } from '@/hooks/useProgress';
import { paths } from '@/routes/paths';

/** Grado e XP nell'intestazione; porta alla pagina Profilo. */
export function XpIndicator() {
  const { t } = useTranslation();
  const { totalXp, rankInfo } = useProgress();

  return (
    <Link
      to={paths.profilo}
      title={t('nav.profile')}
      className="flex items-center gap-2 rounded-lg border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
    >
      <span className="font-semibold text-slate-900 dark:text-white">
        {t(`ranks.${rankInfo.rank}`)}
      </span>
      <span className="font-mono text-xs text-teal-700 dark:text-teal-400">
        {t('xp.amount', { xp: totalXp })}
      </span>
    </Link>
  );
}
