import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Mission } from '@/content/missions';
import { checkOrder, seededShuffle } from '@/engine/checkers';
import { MissionFrame } from './MissionFrame';

const ARROW_UP = '↑';
const ARROW_DOWN = '↓';

type OrderMissionData = Extract<Mission, { tipo: 'ordina' }>;

interface Props {
  mission: OrderMissionData;
  continueLabel: string;
  onContinue: () => void;
}

/** Riordinare elementi con i pulsanti su/giù (funziona bene anche al tocco e da tastiera). */
export function OrderMission({ mission, continueLabel, onContinue }: Props) {
  const { t } = useTranslation();
  const [order, setOrder] = useState(() => seededShuffle(mission.elementi, mission.id));

  function move(index: number, delta: number) {
    setOrder((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target] as string, next[index] as string];
      return next;
    });
  }

  return (
    <MissionFrame
      mission={mission}
      canCheck
      evaluate={() => checkOrder(order, mission.elementi)}
      continueLabel={continueLabel}
      onContinue={onContinue}
    >
      {({ evaluation, locked, clearFeedback }) => (
        <ol className="space-y-2">
          {order.map((item, index) => {
            const label = mission.text.opzioni?.[item] ?? item;
            const wrong = evaluation?.tipo === 'ordina' && evaluation.correctAt[index] === false;
            const right = locked || (evaluation?.tipo === 'ordina' && evaluation.correctAt[index]);
            return (
              <li
                key={item}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  right && evaluation
                    ? 'border-teal-400 bg-teal-50 dark:border-teal-700 dark:bg-teal-950/40'
                    : wrong
                      ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40'
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                }`}
              >
                <span className="w-6 text-center font-mono text-sm font-bold text-slate-500">
                  {index + 1}
                </span>
                <span className="flex-1">{label}</span>
                {!locked && (
                  <span className="flex gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => {
                        clearFeedback();
                        move(index, -1);
                      }}
                      aria-label={t('mission.order.up', { item: label })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-30 dark:border-slate-600"
                    >
                      {ARROW_UP}
                    </button>
                    <button
                      type="button"
                      disabled={index === order.length - 1}
                      onClick={() => {
                        clearFeedback();
                        move(index, 1);
                      }}
                      aria-label={t('mission.order.down', { item: label })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-30 dark:border-slate-600"
                    >
                      {ARROW_DOWN}
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </MissionFrame>
  );
}
