import type { Mission } from '@/content/missions';
import { ChoiceMission } from './ChoiceMission';
import { FillMission } from './FillMission';
import { OrderMission } from './OrderMission';
import { TerminalMission } from './TerminalMission';

interface Props {
  mission: Mission;
  continueLabel: string;
  onContinue: () => void;
}

/** Sceglie il componente giusto in base al tipo di esercizio. Nuovi tipi si aggiungono qui. */
export function MissionRenderer({ mission, ...rest }: Props) {
  switch (mission.tipo) {
    case 'scelta':
    case 'scelta-multipla':
      return <ChoiceMission mission={mission} {...rest} />;
    case 'ordina':
      return <OrderMission mission={mission} {...rest} />;
    case 'completa':
      return <FillMission mission={mission} {...rest} />;
    case 'terminale':
      return <TerminalMission mission={mission} {...rest} />;
  }
}
