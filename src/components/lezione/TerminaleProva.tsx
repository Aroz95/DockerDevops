import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal } from '@/components/terminale/Terminal';
import { Machine } from '@/engine/sim/machine';

interface TerminaleProvaProps {
  /** Cartelle da creare all'avvio (percorsi relativi alla cartella personale). */
  cartelle?: string[];
  /** File da creare all'avvio: percorso → contenuto. */
  file?: Record<string, string>;
  /** Cartella di partenza. */
  cartella?: string;
}

/**
 * Terminale da provare dentro una lezione: <Terminale cartelle={["documenti"]} />.
 * Non assegna XP e non viene salvato: serve solo per sperimentare mentre si legge.
 */
export function TerminaleProva({ cartelle, file, cartella }: TerminaleProvaProps) {
  const { t } = useTranslation();
  const [machine, setMachine] = useState(() => new Machine({ cartelle, file, cartella }));

  return (
    <div className="not-prose my-6 space-y-2">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('lesson.tryIt')}</p>
      <Terminal machine={machine} className="[&_[role=log]]:h-56" />
      <button
        type="button"
        onClick={() => setMachine(new Machine({ cartelle, file, cartella }))}
        className="text-xs font-semibold text-slate-600 underline dark:text-slate-300"
      >
        {t('terminal.reset')}
      </button>
    </div>
  );
}
