import { useTranslation } from 'react-i18next';
import { XP } from '@/engine/xp';

interface HintPanelProps {
  hints: string[];
  revealed: number;
  /** true se la missione è già superata: i suggerimenti non costano più XP. */
  free: boolean;
  onReveal: () => void;
}

/** Suggerimenti progressivi: indizio, indizio più forte, soluzione spiegata. */
export function HintPanel({ hints, revealed, free, onReveal }: HintPanelProps) {
  const { t } = useTranslation();
  const shown = hints.slice(0, revealed);

  return (
    <div className="space-y-3">
      {shown.length > 0 && (
        <ol className="space-y-2">
          {shown.map((hint, index) => (
            <li
              key={hint}
              className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-900 dark:bg-sky-950/40"
            >
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-300">
                {t('mission.hints.label', { number: index + 1, total: hints.length })}
              </span>
              {hint}
            </li>
          ))}
        </ol>
      )}
      {revealed < hints.length && (
        <button
          type="button"
          onClick={onReveal}
          className="text-sm font-semibold text-sky-800 underline dark:text-sky-300"
        >
          {free
            ? t('mission.hints.showFree', { number: revealed + 1 })
            : t('mission.hints.show', {
                number: revealed + 1,
                penalty: Math.round(XP.hintPenalty * 100),
              })}
        </button>
      )}
    </div>
  );
}
