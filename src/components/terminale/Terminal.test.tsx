import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { MissionRenderer } from '@/components/esercizi/MissionRenderer';
import type { Mission } from '@/content/missions';
import { ProgressProvider } from '@/context/ProgressProvider';
import { SettingsProvider } from '@/context/SettingsProvider';
import { paths } from '@/routes/paths';
import { loadProgress } from '@/state/progress-storage';
import { emptyProgress } from '@/state/progressReducer';
import { renderApp } from '@/test/renderApp';

describe('Palestra del terminale', () => {
  it('esegue i comandi digitati e mostra l\'output', async () => {
    const user = userEvent.setup();
    renderApp({ route: paths.palestra });

    const input = screen.getByLabelText('Comando da eseguire');
    await user.type(input, 'mkdir progetto{Enter}');
    await user.type(input, 'ls{Enter}');

    const log = screen.getByRole('log');
    expect(within(log).getByText('progetto')).toBeInTheDocument();
    expect(within(log).getAllByText('studente@corso:~$').length).toBeGreaterThan(0);
  });

  it('richiama i comandi precedenti con la freccia su e completa con Tab', async () => {
    const user = userEvent.setup();
    renderApp({ route: paths.palestra });

    const input = screen.getByLabelText('Comando da eseguire');
    await user.type(input, 'pwd{Enter}');
    await user.click(screen.getByRole('button', { name: 'Comando precedente' }));
    expect(input).toHaveValue('pwd');

    await user.clear(input);
    await user.type(input, 'whoa');
    await user.click(screen.getByRole('button', { name: 'Completa il nome (Tab)' }));
    expect(input).toHaveValue('whoami ');
  });

  it('spiega nella lingua dello studente i comandi sconosciuti', async () => {
    const user = userEvent.setup();
    renderApp({ route: paths.palestra });
    await user.type(screen.getByLabelText('Comando da eseguire'), 'pippo{Enter}');
    expect(screen.getByText('pippo: command not found')).toBeInTheDocument();
    expect(screen.getByText(/Il comando «pippo» non esiste/)).toBeInTheDocument();
  });
});

const missione: Mission = {
  id: 'prova-terminale',
  levelId: 'prova',
  dopoLezione: 'prova',
  tipo: 'terminale',
  inizio: { cartelle: ['documenti'] },
  obiettivi: [
    { tipo: 'esiste', percorso: '~/progetto', come: 'cartella' },
    { tipo: 'cartella-corrente', percorso: '~/progetto' },
  ],
  text: {
    titolo: 'Prova',
    domanda: 'Crea la cartella progetto ed entraci.',
    suggerimenti: ['Usa mkdir e poi cd.'],
    spiegazione: 'Hai creato la cartella e ci sei entrato.',
    obiettivi: ['Crea la cartella progetto', 'Entra nella cartella progetto'],
  },
};

/** Testo degli obiettivi nella lista, con il simbolo di stato. */
const goals = () => screen.getAllByRole('listitem').map((item) => item.textContent);

function renderMission() {
  return render(
    <SettingsProvider initialSettings={{ language: 'it', theme: 'light' }}>
      <ProgressProvider initialProgress={emptyProgress()}>
        <MemoryRouter>
          <MissionRenderer mission={missione} continueLabel="Continua" onContinue={() => {}} />
        </MemoryRouter>
      </ProgressProvider>
    </SettingsProvider>,
  );
}

describe('Missione nel terminale', () => {
  it('spunta gli obiettivi mentre si lavora e si supera con Verifica', async () => {
    const user = userEvent.setup();
    renderMission();
    const input = screen.getByLabelText('Comando da eseguire');

    await user.click(screen.getByRole('button', { name: 'Verifica' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Obiettivi raggiunti: 0 su 2.');
    expect(screen.getByRole('alert')).toHaveTextContent('Manca ancora: Crea la cartella progetto');

    await user.type(input, 'mkdir progetto{Enter}');
    expect(goals()).toEqual(['✓Crea la cartella progetto (fatto)', '○Entra nella cartella progetto (da fare)']);

    await user.type(input, 'cd progetto{Enter}');
    await user.click(screen.getByRole('button', { name: 'Verifica' }));
    expect(screen.getByText('Missione superata! +50 XP')).toBeInTheDocument();
    expect(loadProgress().missions['prova-terminale']).toMatchObject({ attempts: 2 });
  });

  it('"Ricomincia" dà un computer nuovo', async () => {
    const user = userEvent.setup();
    renderMission();
    const input = screen.getByLabelText('Comando da eseguire');
    await user.type(input, 'mkdir progetto{Enter}');
    expect(goals()[0]).toBe('✓Crea la cartella progetto (fatto)');
    await user.click(screen.getByRole('button', { name: 'Ricomincia da capo (computer nuovo)' }));
    expect(goals()[0]).toBe('○Crea la cartella progetto (da fare)');
  });
});
