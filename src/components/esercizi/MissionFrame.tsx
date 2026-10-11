import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Mission } from '@/content/missions';
import type { Evaluation } from '@/engine/checkers';
import { XP } from '@/engine/xp';
import { useProgress } from '@/hooks/useProgress';
import { FeedbackPanel } from './FeedbackPanel';
import { HintPanel } from './HintPanel';

export interface MissionRenderState {
  /** Esito dell'ultima verifica (null se non c'è o se la risposta è stata modificata dopo). */
  evaluation: Evaluation | null;
  /** true dopo il superamento: la risposta non si modifica più. */
  locked: boolean;
  /** Da chiamare quando lo studente cambia la risposta: nasconde il feedback ormai vecchio. */
  clearFeedback: () => void;
}

interface MissionFrameProps {
  mission: Mission;
  /** false finché la risposta è vuota: il pulsante "Verifica" resta disattivato. */
  canCheck: boolean;
  evaluate: () => Evaluation;
  continueLabel: string;
  onContinue: () => void;
  children: (state: MissionRenderState) => ReactNode;
}

/**
 * Cornice comune a tutte le missioni: domanda, risposta (fornita dal tipo di esercizio),
 * verifica, feedback, suggerimenti, XP e passaggio al passo successivo.
 */
export function MissionFrame({
  mission,
  canCheck,
  evaluate,
  continueLabel,
  onContinue,
  children,
}: MissionFrameProps) {
  const { t } = useTranslation();
  const { progress, recordAttempt, takeHint, completeMission } = useProgress();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [freeHints, setFreeHints] = useState(0);

  const record = progress.missions[mission.id];
  // Superata in una visita precedente? (catturato all'apertura: la pagina rimonta per ogni missione)
  const [wasCompleted] = useState(() => Boolean(progress.missions[mission.id]));
  const free = Boolean(record);
  const revealed = free
    ? Math.max(freeHints, record?.hintsUsed ?? 0)
    : (progress.pending[mission.id]?.hintsUsed ?? 0);
  const passed = evaluation?.passed ?? false;

  function check() {
    recordAttempt(mission.id);
    const result = evaluate();
    setEvaluation(result);
    if (result.passed) completeMission(mission.id, mission.xp ?? XP.missionDefault);
  }

  function revealHint() {
    if (free) setFreeHints(revealed + 1);
    else takeHint(mission.id);
  }

  return (
    <div className="space-y-6">
      {wasCompleted && !passed && (
        <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
          {t('mission.alreadyCompleted', { xp: record?.xp ?? 0 })}
        </p>
      )}

      <p className="text-lg font-medium text-slate-900 dark:text-white">{mission.text.domanda}</p>

      {children({ evaluation, locked: passed, clearFeedback: () => setEvaluation(null) })}

      {evaluation && !evaluation.passed && <FeedbackPanel evaluation={evaluation} mission={mission} />}

      {passed ? (
        <div
          role="status"
          className="space-y-3 rounded-xl border border-teal-300 bg-teal-50 p-5 dark:border-teal-800 dark:bg-teal-950/40"
        >
          <p className="text-lg font-bold text-teal-900 dark:text-teal-200">
            {wasCompleted || !record
              ? t('mission.passedAgain')
              : t('mission.passed', { xp: record.xp })}
          </p>
          <p className="text-slate-700 dark:text-slate-200">{mission.text.spiegazione}</p>
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-5 py-2.5 font-semibold text-white hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
          >
            {continueLabel}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <button
            type="button"
            onClick={check}
            disabled={!canCheck}
            className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-5 py-2.5 font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
          >
            {t('mission.check')}
          </button>
          <HintPanel
            hints={mission.text.suggerimenti}
            revealed={revealed}
            free={free}
            onReveal={revealHint}
          />
        </div>
      )}
    </div>
  );
}
