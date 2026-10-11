import type { ReactNode } from 'react';

interface CardProps {
  as?: 'div' | 'article' | 'section' | 'li';
  className?: string;
  children: ReactNode;
}

export function Card({ as: Tag = 'div', className = '', children }: CardProps) {
  return (
    <Tag
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </Tag>
  );
}
