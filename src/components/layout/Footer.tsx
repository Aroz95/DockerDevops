import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800">
      <p className="mx-auto max-w-5xl px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
        {t('footer.storage')}
      </p>
    </footer>
  );
}
