import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { paths } from '@/routes/paths';
import { createExport, loadProgress } from '@/state/progress-storage';
import { emptyProgress, progressReducer } from '@/state/progressReducer';
import { renderApp } from '@/test/renderApp';

const AT = '2026-10-11T12:00:00.000Z';

const withProgress = progressReducer(
  progressReducer(emptyProgress(), { type: 'lessonRead', lessonId: 'l1', at: AT }),
  { type: 'missionCompleted', missionId: 'm1', baseXp: 300, at: AT },
);

describe('Pagina Profilo', () => {
  it('mostra grado, XP e quanto manca al grado successivo', () => {
    renderApp({ route: paths.profilo, progress: withProgress });
    expect(screen.getByRole('heading', { level: 1, name: 'Il tuo profilo' })).toBeInTheDocument();
    expect(screen.getAllByText('Marinaio').length).toBeGreaterThan(0);
    expect(screen.getAllByText('310 XP').length).toBeGreaterThan(0);
    expect(screen.getByText(/Ti mancano 440 XP per diventare Timoniere/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '12');
  });

  it('azzera i progressi solo dopo la conferma', async () => {
    const user = userEvent.setup();
    renderApp({ route: paths.profilo, progress: withProgress });

    await user.click(screen.getByRole('button', { name: 'Azzera progressi' }));
    await user.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(screen.getAllByText('310 XP').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Azzera progressi' }));
    await user.click(screen.getByRole('button', { name: 'Sì, azzera tutto' }));
    expect(screen.getByText('Progressi azzerati.')).toBeInTheDocument();
    expect(screen.getAllByText('0 XP').length).toBeGreaterThan(0);
    expect(loadProgress()).toEqual(emptyProgress());
  });

  it('importa un file di progressi dopo la conferma', async () => {
    const user = userEvent.setup();
    renderApp({ route: paths.profilo });

    const file = new File([JSON.stringify(createExport(withProgress, AT))], 'progressi.json', {
      type: 'application/json',
    });
    await user.upload(screen.getByLabelText('Importa da file'), file);

    expect(await screen.findByText(/1 lezioni lette e 1 missioni superate/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sì, sostituisci' }));

    expect(screen.getByText('Progressi importati.')).toBeInTheDocument();
    expect(screen.getAllByText('310 XP').length).toBeGreaterThan(0);
  });

  it('spiega l\'errore se il file non è valido', async () => {
    const user = userEvent.setup();
    renderApp({ route: paths.profilo });

    const file = new File(['ciao'], 'testo.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText('Importa da file'), file);

    expect(await screen.findByRole('alert')).toHaveTextContent(/non contiene dati in formato JSON/);
  });
});
