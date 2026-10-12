/**
 * Ogni missione nel terminale deve essere risolvibile: qui c'è una soluzione per ciascuna,
 * eseguita sul simulatore. Se una missione nuova non ha la sua soluzione, il test fallisce.
 */
import { describe, expect, it } from 'vitest';
import { checkGoals } from '@/engine/sim/goals';
import { Machine } from '@/engine/sim/machine';
import { getMissionData } from './missions';

const SOLUTIONS: Record<string, string[]> = {
  'primo-comando': ['whoami', 'hostname'],
  'file-nascosti': ['ls -la', 'man mkdir'],
  'trova-la-strada': ['cd documenti', 'cd lavoro/2026', 'pwd'],
  'metti-in-ordine': [
    'mkdir -p archivio/foto',
    'mv scrivania/foto-mare.jpg archivio/foto',
    'cp scrivania/lista.txt archivio',
    'rm scrivania/vecchio.tmp',
  ],
  scorciatoie: ['cd progetto-docker-del-corso/esercizi', 'history'],
};

const terminalMissions = Object.values(getMissionData().logic)
  .flat()
  .flatMap((mission) => (mission.tipo === 'terminale' ? [mission] : []));

describe('missioni nel terminale', () => {
  it.each(terminalMissions.map((m) => [m.id, m] as const))('"%s" è risolvibile', (id, mission) => {
    const solution = SOLUTIONS[id];
    expect(solution, `manca la soluzione di "${id}" in SOLUTIONS`).toBeDefined();
    const machine = new Machine(mission.inizio, () => Date.UTC(2026, 9, 12, 10));
    expect(checkGoals(mission.obiettivi, machine).every(Boolean), 'già superata all\'inizio').toBe(false);
    for (const line of solution ?? []) machine.exec(line);
    expect(checkGoals(mission.obiettivi, machine)).toEqual(mission.obiettivi.map(() => true));
  });

  it('"metti-in-ordine" non si supera copiando invece di spostare', () => {
    const mission = terminalMissions.find((m) => m.id === 'metti-in-ordine');
    if (!mission) throw new Error('missione mancante');
    const machine = new Machine(mission.inizio);
    for (const line of ['mkdir -p archivio/foto', 'cp scrivania/foto-mare.jpg archivio/foto', 'cp scrivania/lista.txt archivio', 'rm scrivania/vecchio.tmp']) {
      machine.exec(line);
    }
    expect(checkGoals(mission.obiettivi, machine)).toEqual([true, true, false, true, true, true]);
  });
});
