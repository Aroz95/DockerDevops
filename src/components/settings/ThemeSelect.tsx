import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/hooks/useSettings';
import { isTheme, THEMES } from '@/state/settings';

export function ThemeSelect() {
  const { t } = useTranslation();
  const { settings, setTheme } = useSettings();
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        {t('settings.theme.label')}
      </label>
      <select
        id={id}
        value={settings.theme}
        onChange={(event) => {
          if (isTheme(event.target.value)) setTheme(event.target.value);
        }}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
      >
        {THEMES.map((theme) => (
          <option key={theme} value={theme}>
            {t(`settings.theme.${theme}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
