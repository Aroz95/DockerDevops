import { useTranslation } from 'react-i18next';
import type { Mission } from '@/content/missions';
import type { Evaluation } from '@/engine/checkers';

/**
 * Feedback di una risposta sbagliata, in tre parti (piano, sezione 6):
 * cosa è corretto, cosa manca, un suggerimento sul perché.
 */
export function FeedbackPanel({ evaluation, mission }: { evaluation: Evaluation; mission: Mission }) {
  const { t } = useTranslation();
  const lines: string[] = [];
  const why: string[] = [];

  switch (evaluation.tipo) {
    case 'scelta': {
      lines.push(t(evaluation.selected ? 'mission.feedback.choiceWrong' : 'mission.feedback.choiceNone'));
      const reason = evaluation.selected ? mission.text.feedback?.[evaluation.selected] : undefined;
      if (reason) why.push(reason);
      break;
    }
    case 'scelta-multipla': {
      lines.push(t('mission.feedback.multipleRight', { count: evaluation.rightSelected.length }));
      if (evaluation.missing > 0) {
        lines.push(t('mission.feedback.multipleMissing', { count: evaluation.missing }));
      }
      if (evaluation.wrongSelected.length > 0) {
        lines.push(t('mission.feedback.multipleWrong', { count: evaluation.wrongSelected.length }));
      }
      for (const id of evaluation.wrongSelected) {
        const reason = mission.text.feedback?.[id];
        if (reason) why.push(reason);
      }
      break;
    }
    case 'ordina':
      lines.push(
        t('mission.feedback.order', {
          right: evaluation.correctAt.filter(Boolean).length,
          total: evaluation.correctAt.length,
        }),
      );
      break;
    case 'terminale':
      lines.push(
        t('mission.feedback.goals', {
          right: evaluation.goals.filter(Boolean).length,
          total: evaluation.goals.length,
        }),
      );
      evaluation.goals.forEach((ok, index) => {
        const goal = mission.text.obiettivi?.[index];
        if (!ok && goal) why.push(t('mission.feedback.goalMissing', { goal }));
      });
      break;
    case 'completa':
      lines.push(
        t('mission.feedback.fill', {
          right: evaluation.blanks.filter(Boolean).length,
          total: evaluation.blanks.length,
        }),
      );
      evaluation.blanks.forEach((ok, index) => {
        const reason = mission.text.feedbackSpazi?.[index];
        if (!ok && reason) why.push(reason);
      });
      break;
  }

  return (
    <div
      role="alert"
      className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/40"
    >
      <p className="font-bold text-amber-900 dark:text-amber-200">{t('mission.feedback.title')}</p>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {why.map((reason) => (
        <p key={reason} className="border-l-2 border-amber-400 pl-3 italic">
          {reason}
        </p>
      ))}
      <p className="text-amber-900 dark:text-amber-200">{t('mission.feedback.tryAgain')}</p>
    </div>
  );
}
