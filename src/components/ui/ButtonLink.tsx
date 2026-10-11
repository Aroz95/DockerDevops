import type { ReactNode } from 'react';
import { Link } from 'react-router';

type Variant = 'primary' | 'secondary';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400',
  secondary:
    'border border-slate-300 text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800',
};

interface ButtonLinkProps {
  to: string;
  variant?: Variant;
  children: ReactNode;
}

/** Collegamento interno con l'aspetto di un pulsante. */
export function ButtonLink({ to, variant = 'primary', children }: ButtonLinkProps) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition-colors ${VARIANTS[variant]}`}
    >
      {children}
    </Link>
  );
}
