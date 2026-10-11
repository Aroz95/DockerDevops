import { use } from 'react';
import { ProgressContext, type ProgressContextValue } from '@/context/progress-context';

export function useProgress(): ProgressContextValue {
  const context = use(ProgressContext);
  if (!context) {
    throw new Error('useProgress va usato dentro <ProgressProvider>.');
  }
  return context;
}
