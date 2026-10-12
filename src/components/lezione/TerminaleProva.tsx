import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal } from '@/components/terminale/Terminal';
import { Machine, type MachineSetup } from '@/engine/sim/machine';

/** Stesse impostazioni di partenza delle missioni (cartelle, file, permessi, processi…). */
type TerminaleProvaProps = MachineSetup;

/**
 * Terminale da provare dentro una lezione: <Terminale cartelle={["documenti"]} />.
 * Non assegna XP e non viene salvato: serve solo per sperimentare mentre si legge.
 */
export function TerminaleProva(setup: TerminaleProvaProps) {
  const { t } = useTranslation();
  const [machine, setMachine] = useState(() => new Machine(setup));

  return (
    <div className="not-prose my-6 space-y-2">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('lesson.tryIt')}</p>
      <Terminal machine={machine} className="[&_[role=log]]:h-56" />
      <button
        type="button"
        onClick={() => setMachine(new Machine(setup))}
        className="text-xs font-semibold text-slate-600 underline dark:text-slate-300"
      >
        {t('terminal.reset')}
      </button>
    </div>
  );
}
