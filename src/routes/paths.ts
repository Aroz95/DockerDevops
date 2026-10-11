/**
 * Tutti gli indirizzi del sito in un unico punto.
 * I componenti usano sempre queste costanti, mai stringhe scritte a mano:
 * se un indirizzo cambia, si cambia solo qui.
 */
export const paths = {
  home: '/',
  mappa: '/mappa',
  profilo: '/profilo',
  glossario: '/glossario',
  palestra: '/palestra',
  livelloPattern: '/livello/:livelloId',
  lezionePattern: '/livello/:livelloId/lezione/:lezioneId',
  missionePattern: '/livello/:livelloId/missione/:missioneId',
  missione: (livelloId: string, missioneId: string) => `/livello/${livelloId}/missione/${missioneId}`,
  livello: (livelloId: string) => `/livello/${livelloId}`,
  lezione: (livelloId: string, lezioneId: string) => `/livello/${livelloId}/lezione/${lezioneId}`,
  termine: (id: string) => `/glossario#${id}`,
  /** Indirizzo di un passo del livello (lezione o missione). */
  passo: (livelloId: string, step: { kind: 'lesson' | 'mission'; id: string }) =>
    step.kind === 'lesson'
      ? `/livello/${livelloId}/lezione/${step.id}`
      : `/livello/${livelloId}/missione/${step.id}`,
} as const;
