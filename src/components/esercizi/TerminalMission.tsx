import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal } from '@/components/terminale/Terminal';
import type { Mission } from '@/content/missions';
import { checkTerminal } from '@/engine/checkers';
import { checkGoals } from '@/engine/sim/goals';
import { Machine } from '@/engine/sim/machine';
import { MissionFrame } from './MissionFrame';

type TerminalMissionData = Extract<Mission, { tipo: 'terminale' }>;

interface Props {
  mission: TerminalMissionData;
  continueLabel: string;
  onContinue: () => void;
}

const CHECK = '✓';
const TODO = '○';

/** Missione nel terminale simulato, con gli obiettivi che si spuntano mentre si lavora. */
export function TerminalMission({ mission, continueLabel, onContinue }: Props) {
  const { t } = useTranslation();
  const [machine, setMachine] = useState(() => new Machine(mission.inizio));
  const [, setTick] = useState(0);
  const reached = checkGoals(mission.obiettivi, machine);

  return (
    <MissionFrame
      mission={mission}
      canCheck
      evaluate={() => checkTerminal(mission.obiettivi, machine)}
      continueLabel={continueLabel}
      onContinue={onContinue}
    >
      {({ locked, clearFeedback }) => (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-sm font-bold text-slate-900 dark:text-white">{t('mission.goals.title')}</p>
            <ul className="space-y-1.5">
              {mission.obiettivi.map((goal, index) => {
                const done = reached[index] ?? false;
                return (
                  <li key={`${goal.tipo}-${index}`} className="flex items-start gap-2 text-sm">
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 font-bold ${done ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}
                    >
                      {done ? CHECK : TODO}
                    </span>
                    <span className={done ? 'text-slate-500 line-through dark:text-slate-400' : ''}>
                      {mission.text.obiettivi?.[index]}
                      <span className="sr-only">
                        {t(done ? 'mission.goals.done' : 'mission.goals.todo')}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <Terminal
            machine={machine}
            onCommand={() => {
              clearFeedback();
              setTick((n) => n + 1);
            }}
          />

          {!locked && (
            <button
              type="button"
              onClick={() => {
                clearFeedback();
                setMachine(new Machine(mission.inizio));
              }}
              className="text-sm font-semibold text-slate-600 underline dark:text-slate-300"
            >
              {t('terminal.reset')}
            </button>
          )}
        </div>
      )}
    </MissionFrame>
  );
}
