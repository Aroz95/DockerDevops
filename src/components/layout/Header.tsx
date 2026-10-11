import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router';
import { XpIndicator } from '@/components/gamification/XpIndicator';
import { LanguageSwitcher } from '@/components/settings/LanguageSwitcher';
import { ThemeSelect } from '@/components/settings/ThemeSelect';
import { paths } from '@/routes/paths';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white'
      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
  }`;

export function Header() {
  const { t } = useTranslation();

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link to={paths.home} className="flex items-baseline gap-1.5">
          <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('app.name')}
          </span>
          <span className="text-sm font-medium text-teal-700 dark:text-teal-400">
            {t('app.tagline')}
          </span>
        </Link>

        <nav aria-label={t('nav.label')} className="flex gap-1">
          <NavLink to={paths.home} end className={navLinkClass}>
            {t('nav.home')}
          </NavLink>
          <NavLink to={paths.mappa} className={navLinkClass}>
            {t('nav.map')}
          </NavLink>
          <NavLink to={paths.profilo} className={navLinkClass}>
            {t('nav.profile')}
          </NavLink>
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <XpIndicator />
          <ThemeSelect />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
