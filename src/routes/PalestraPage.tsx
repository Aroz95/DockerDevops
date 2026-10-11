import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal } from '@/components/terminale/Terminal';
import { Machine } from '@/engine/sim/machine';
import type { OutputLine } from '@/engine/sim/types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const WELCOME: OutputLine[] = [{ kind: 'hint', key: 'helpIntro' }];

const EXAMPLES = ['pwd', 'ls -la', 'mkdir progetto && cd progetto', 'echo ciao > saluto.txt', 'docker run hello-world', 'docker run -d -p 8080:80 --name web nginx', 'docker ps'];

/** Palestra: un terminale libero, senza obiettivi, per provare comandi senza paura. */
export function PalestraPage() {
  const { t } = useTranslation();
  const [machine, setMachine] = useState(() => new Machine());
  useDocumentTitle(t('gym.title'));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t('gym.title')}
        </h1>
        <p className="text-slate-600 dark:text-slate-300">{t('gym.intro')}</p>
      </header>

      <Terminal machine={machine} initialLines={WELCOME} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600 dark:text-slate-300">{t('gym.tryThese')}</span>
        {EXAMPLES.map((example) => (
          <code
            key={example}
            className="rounded bg-slate-200 px-2 py-0.5 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            {example}
          </code>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setMachine(new Machine())}
        className="text-sm font-semibold text-slate-600 underline dark:text-slate-300"
      >
        {t('terminal.reset')}
      </button>

      <p className="text-sm text-slate-500 dark:text-slate-400">{t('gym.note')}</p>
    </div>
  );
}
