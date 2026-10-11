import { useTranslation } from 'react-i18next';
import { useUpdateAvailable } from '@/hooks/useUpdateAvailable';

/** Avviso "c'è una nuova versione": ricaricando la pagina si passa alla versione aggiornata. */
export function UpdateBanner() {
  const { t } = useTranslation();
  const available = useUpdateAvailable();
  if (!available) return null;

  return (
    <div role="status" className="bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <span>{t('update.available')}</span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-white px-3 py-1 font-semibold text-teal-800"
        >
          {t('update.reload')}
        </button>
      </div>
    </div>
  );
}
