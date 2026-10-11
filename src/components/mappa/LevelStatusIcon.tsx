import type { LevelStatus } from '@/engine/unlock';

const ICONS: Record<LevelStatus, string> = {
  completed: '✓',
  available: '▶',
  locked: '🔒',
  comingSoon: '…',
};

const STYLES: Record<LevelStatus, string> = {
  completed: 'bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950',
  available: 'bg-amber-400 text-slate-950',
  locked: 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
  comingSoon: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
};

/** Pallino colorato con il simbolo dello stato. Decorativo: il testo accanto lo descrive. */
export function LevelStatusIcon({ status }: { status: LevelStatus }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${STYLES[status]}`}
    >
      {ICONS[status]}
    </span>
  );
}
