import { useTranslation } from 'react-i18next';
import { BadgeGrid } from '@/components/gamification/BadgeGrid';
import { ProgressBackup } from '@/components/profilo/ProgressBackup';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProgress } from '@/hooks/useProgress';

export function ProfiloPage() {
  const { t } = useTranslation();
  const { progress, totalXp, rankInfo, streak } = useProgress();
  useDocumentTitle(t('profile.title'));

  const stats = [
    { id: 'lessons', value: Object.keys(progress.lessonsRead).length },
    { id: 'missions', value: Object.keys(progress.missions).length },
    { id: 'streak', value: streak },
    { id: 'badges', value: Object.keys(progress.badges).length },
  ] as const;

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {t('profile.title')}
      </h1>

      <Card as="section" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400">
              {t('profile.rank')}
            </p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {t(`ranks.${rankInfo.rank}`)}
            </p>
          </div>
          <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
            {t('xp.amount', { xp: totalXp })}
          </p>
        </div>
        <ProgressBar value={rankInfo.progress} label={t('profile.rankProgress')} />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {rankInfo.next && rankInfo.xpToNext !== null
            ? t('profile.toNextRank', { xp: rankInfo.xpToNext, rank: t(`ranks.${rankInfo.next}`) })
            : t('profile.maxRank')}
        </p>
      </Card>

      <section aria-labelledby="statistiche" className="space-y-4">
        <h2 id="statistiche" className="text-xl font-bold text-slate-900 dark:text-white">
          {t('profile.statsTitle')}
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.id} className="p-4!">
              <dt className="text-sm text-slate-600 dark:text-slate-300">
                {t(`profile.stats.${stat.id}`)}
              </dt>
              <dd className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
                {stat.value}
              </dd>
            </Card>
          ))}
        </dl>
      </section>

      <section aria-labelledby="badge" className="space-y-4">
        <h2 id="badge" className="text-xl font-bold text-slate-900 dark:text-white">
          {t('profile.badgesTitle')}
        </h2>
        <BadgeGrid />
      </section>

      <section aria-labelledby="salvataggio" className="space-y-4">
        <h2 id="salvataggio" className="text-xl font-bold text-slate-900 dark:text-white">
          {t('backup.title')}
        </h2>
        <ProgressBackup />
      </section>
    </div>
  );
}
