interface ProgressBarProps {
  /** Valore da 0 a 1. */
  value: number;
  label: string;
  className?: string;
}

export function ProgressBar({ value, label, className = '' }: ProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={`h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 ${className}`}
    >
      <div
        className="h-full rounded-full bg-teal-500 transition-[width] duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
