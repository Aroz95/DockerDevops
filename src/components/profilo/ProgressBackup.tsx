import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toLocalDay } from '@/engine/dates';
import { useProgress } from '@/hooks/useProgress';
import {
  createExport,
  exportFileName,
  parseImport,
  type ImportError,
} from '@/state/progress-storage';
import type { ProgressState } from '@/types/progress';
import { readFileAsText } from '@/utils/readFileAsText';

type Status =
  | { kind: 'idle' }
  | { kind: 'confirmImport'; progress: ProgressState }
  | { kind: 'confirmReset' }
  | { kind: 'imported' }
  | { kind: 'reset' }
  | { kind: 'error'; error: ImportError | 'readFailed' };

const buttonBase =
  'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors';
const primary = `${buttonBase} bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400`;
const secondary = `${buttonBase} border border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800`;
const danger = `${buttonBase} bg-red-600 text-white hover:bg-red-700`;

/** Esporta, importa e azzera i progressi. Ogni azione distruttiva chiede conferma. */
export function ProgressBackup() {
  const { t } = useTranslation();
  const { progress, importProgress, resetProgress, storageAvailable } = useProgress();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const fileInput = useRef<HTMLInputElement>(null);

  function handleExport() {
    const data = createExport(progress, new Date().toISOString());
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFileName(toLocalDay(new Date()));
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // permette di riscegliere lo stesso file
    if (!file) return;
    try {
      const result = parseImport(await readFileAsText(file));
      setStatus(
        result.ok
          ? { kind: 'confirmImport', progress: result.progress }
          : { kind: 'error', error: result.error },
      );
    } catch {
      setStatus({ kind: 'error', error: 'readFailed' });
    }
  }

  return (
    <div className="space-y-4">
      {!storageAvailable && (
        <p role="alert" className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {t('backup.storageUnavailable')}
        </p>
      )}

      <p className="text-sm text-slate-600 dark:text-slate-300">{t('backup.intro')}</p>

      <div className="flex flex-wrap gap-3">
        <button type="button" className={primary} onClick={handleExport}>
          {t('backup.export')}
        </button>
        <button type="button" className={secondary} onClick={() => fileInput.current?.click()}>
          {t('backup.import')}
        </button>
        <button
          type="button"
          className={secondary}
          onClick={() => setStatus({ kind: 'confirmReset' })}
        >
          {t('backup.reset')}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label={t('backup.import')}
          onChange={(event) => void handleFile(event)}
        />
      </div>

      <div aria-live="polite">
        {status.kind === 'confirmImport' && (
          <div className="space-y-3 rounded-lg border border-slate-300 p-4 dark:border-slate-700">
            <p className="text-sm">
              {t('backup.confirmImport', {
                lessons: Object.keys(status.progress.lessonsRead).length,
                missions: Object.keys(status.progress.missions).length,
              })}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className={danger}
                onClick={() => {
                  importProgress(status.progress);
                  setStatus({ kind: 'imported' });
                }}
              >
                {t('backup.confirmImportYes')}
              </button>
              <button type="button" className={secondary} onClick={() => setStatus({ kind: 'idle' })}>
                {t('backup.cancel')}
              </button>
            </div>
          </div>
        )}

        {status.kind === 'confirmReset' && (
          <div className="space-y-3 rounded-lg border border-red-300 p-4 dark:border-red-900">
            <p className="text-sm">{t('backup.confirmReset')}</p>
            <div className="flex gap-3">
              <button
                type="button"
                className={danger}
                onClick={() => {
                  resetProgress();
                  setStatus({ kind: 'reset' });
                }}
              >
                {t('backup.confirmResetYes')}
              </button>
              <button type="button" className={secondary} onClick={() => setStatus({ kind: 'idle' })}>
                {t('backup.cancel')}
              </button>
            </div>
          </div>
        )}

        {status.kind === 'imported' && (
          <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
            {t('backup.importedOk')}
          </p>
        )}
        {status.kind === 'reset' && (
          <p className="text-sm font-medium text-teal-700 dark:text-teal-400">{t('backup.resetOk')}</p>
        )}
        {status.kind === 'error' && (
          <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
            {t(`backup.errors.${status.error}`)}
          </p>
        )}
      </div>
    </div>
  );
}
