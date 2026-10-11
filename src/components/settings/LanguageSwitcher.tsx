import { useTranslation } from 'react-i18next';
import { useSettings } from '@/hooks/useSettings';
import { LANGUAGES } from '@/i18n/languages';

/** Pulsanti IT / EN. Il cambio è immediato e non tocca i progressi. */
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { settings, setLanguage } = useSettings();

  return (
    <div
      role="group"
      aria-label={t('settings.language')}
      className="inline-flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-700"
    >
      {LANGUAGES.map((language) => {
        const active = settings.language === language;
        return (
          <button
            key={language}
            type="button"
            lang={language}
            aria-pressed={active}
            title={t(`languages.${language}`)}
            onClick={() => setLanguage(language)}
            className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${
              active
                ? 'bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {language}
          </button>
        );
      })}
    </div>
  );
}
