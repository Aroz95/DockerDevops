import { useTranslation } from 'react-i18next';
import { BADGE_ICONS, BADGE_IDS } from '@/engine/badges';
import { useProgress } from '@/hooks/useProgress';

/** Tutti i badge: quelli ottenuti a colori, gli altri in grigio con la descrizione di come ottenerli. */
export function BadgeGrid() {
  const { t, i18n } = useTranslation();
  const { progress } = useProgress();
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {BADGE_IDS.map((id) => {
        const earnedAt = progress.badges[id];
        return (
          <li
            key={id}
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              earnedAt
                ? 'border-teal-300 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/40'
                : 'border-slate-200 opacity-60 dark:border-slate-800'
            }`}
          >
            <span aria-hidden="true" className={`text-2xl ${earnedAt ? '' : 'grayscale'}`}>
              {BADGE_ICONS[id]}
            </span>
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-900 dark:text-white">
                {t(`badges.${id}.name`)}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {t(`badges.${id}.description`)}
              </p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {earnedAt
                  ? t('profile.badgeEarned', { date: dateFormat.format(new Date(earnedAt)) })
                  : t('profile.badgeLocked')}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
