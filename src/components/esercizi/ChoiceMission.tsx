import { useId, useState } from 'react';
import type { Mission } from '@/content/missions';
import { checkChoice, checkMultipleChoice } from '@/engine/checkers';
import { MissionFrame } from './MissionFrame';

type ChoiceMissionData = Extract<Mission, { tipo: 'scelta' | 'scelta-multipla' }>;

interface Props {
  mission: ChoiceMissionData;
  continueLabel: string;
  onContinue: () => void;
}

/** Scelta singola (pallini) o multipla (caselle). */
export function ChoiceMission({ mission, continueLabel, onContinue }: Props) {
  const multiple = mission.tipo === 'scelta-multipla';
  const [selected, setSelected] = useState<string[]>([]);
  const name = useId();

  const evaluate = () =>
    mission.tipo === 'scelta'
      ? checkChoice(selected[0] ?? null, mission.corretta)
      : checkMultipleChoice(selected, mission.corrette);

  return (
    <MissionFrame
      mission={mission}
      canCheck={selected.length > 0}
      evaluate={evaluate}
      continueLabel={continueLabel}
      onContinue={onContinue}
    >
      {({ evaluation, locked, clearFeedback }) => (
        <fieldset className="space-y-2" disabled={locked}>
          <legend className="sr-only">{mission.text.domanda}</legend>
          {mission.opzioni.map((option) => {
            const checked = selected.includes(option);
            const wrong =
              (evaluation?.tipo === 'scelta' && !evaluation.passed && evaluation.selected === option) ||
              (evaluation?.tipo === 'scelta-multipla' && evaluation.wrongSelected.includes(option));
            const right = locked && checked;
            return (
              <label
                key={option}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                  right
                    ? 'border-teal-400 bg-teal-50 dark:border-teal-700 dark:bg-teal-950/40'
                    : wrong
                      ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40'
                      : checked
                        ? 'border-teal-400 bg-white dark:bg-slate-900'
                        : 'border-slate-200 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900'
                }`}
              >
                <input
                  type={multiple ? 'checkbox' : 'radio'}
                  name={name}
                  value={option}
                  checked={checked}
                  onChange={() => {
                    clearFeedback();
                    setSelected((current) =>
                      multiple
                        ? current.includes(option)
                          ? current.filter((id) => id !== option)
                          : [...current, option]
                        : [option],
                    );
                  }}
                  className="mt-1 h-4 w-4 accent-teal-600"
                />
                <span>{mission.text.opzioni?.[option] ?? option}</span>
              </label>
            );
          })}
        </fieldset>
      )}
    </MissionFrame>
  );
}
