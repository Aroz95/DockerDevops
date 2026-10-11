import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Mission } from '@/content/missions';
import { BLANK } from '@/content/missions-schema';
import { checkFill } from '@/engine/checkers';
import { MissionFrame } from './MissionFrame';

type FillMissionData = Extract<Mission, { tipo: 'completa' }>;

interface Props {
  mission: FillMissionData;
  continueLabel: string;
  onContinue: () => void;
}

/** Frase o comando con spazi "___" da completare. */
export function FillMission({ mission, continueLabel, onContinue }: Props) {
  const { t } = useTranslation();
  const parts = (mission.text.modello ?? '').split(BLANK);
  const [answers, setAnswers] = useState<string[]>(() => mission.risposte.map(() => ''));

  return (
    <MissionFrame
      mission={mission}
      canCheck={answers.some((answer) => answer.trim() !== '')}
      evaluate={() => checkFill(answers, mission.risposte, mission.ignoraMaiuscole)}
      continueLabel={continueLabel}
      onContinue={onContinue}
    >
      {({ evaluation, locked, clearFeedback }) => (
        <p className="rounded-xl border border-slate-200 bg-white p-4 font-mono text-base leading-loose dark:border-slate-700 dark:bg-slate-900">
          {parts.map((part, index) => {
            const blankIndex = index;
            const isLast = index === parts.length - 1;
            const wrong = evaluation?.tipo === 'completa' && evaluation.blanks[blankIndex] === false;
            return (
              <span key={`${index}-${part}`}>
                <span className="whitespace-pre-wrap">{part}</span>
                {!isLast && (
                  <input
                    type="text"
                    value={answers[blankIndex] ?? ''}
                    disabled={locked}
                    autoCapitalize="off"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    aria-label={t('mission.fill.blank', { number: blankIndex + 1 })}
                    aria-invalid={wrong || undefined}
                    onChange={(event) => {
                      clearFeedback();
                      const value = event.target.value;
                      setAnswers((current) =>
                        current.map((answer, i) => (i === blankIndex ? value : answer)),
                      );
                    }}
                    className={`mx-1 inline-block w-36 rounded-md border-b-2 bg-slate-50 px-2 py-0.5 font-mono focus:outline-none dark:bg-slate-800 ${
                      locked
                        ? 'border-teal-500'
                        : wrong
                          ? 'border-amber-500'
                          : 'border-slate-400 focus:border-teal-500'
                    }`}
                  />
                )}
              </span>
            );
          })}
        </p>
      )}
    </MissionFrame>
  );
}
