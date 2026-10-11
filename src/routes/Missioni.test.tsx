import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { loadProgress } from '@/state/progress-storage';
import { emptyProgress, progressReducer } from '@/state/progressReducer';
import { renderApp } from '@/test/renderApp';
import { paths } from './paths';

const AT = '2026-10-11T12:00:00.000Z';

/** Progressi con le lezioni indicate già lette. */
function withLessons(...ids: string[]) {
  return ids.reduce(
    (state, lessonId) => progressReducer(state, { type: 'lessonRead', lessonId, at: AT }),
    emptyProgress(),
  );
}

const LIVELLO = 'come-funziona';

describe('Missioni', () => {
  it('è chiusa finché non si legge la lezione da cui dipende', () => {
    renderApp({ route: paths.missione(LIVELLO, 'sfida-fine-mondo') });
    expect(screen.getByText(/si apre dopo aver letto la lezione «Benvenuto a bordo»/)).toBeInTheDocument();
  });

  it('scelta: spiega l\'errore, il suggerimento costa XP, la risposta giusta completa', async () => {
    const user = userEvent.setup();
    renderApp({ route: paths.missione(LIVELLO, 'sfida-fine-mondo'), progress: withLessons('benvenuto') });

    const check = screen.getByRole('button', { name: 'Verifica' });
    expect(check).toBeDisabled();

    await user.click(screen.getByLabelText('Esame del mondo'));
    await user.click(check);
    expect(screen.getByRole('alert')).toHaveTextContent(/non ci sono esami con voti/);

    await user.click(screen.getByRole('button', { name: /Mostra il suggerimento 1 \(−25% XP\)/ }));
    expect(screen.getByText(/Rileggi la sezione «Come è organizzato»/)).toBeInTheDocument();

    await user.click(screen.getByLabelText('Sfida del Boss'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument(); // feedback vecchio nascosto
    await user.click(screen.getByRole('button', { name: 'Verifica' }));

    expect(screen.getByText('Missione superata! +38 XP')).toBeInTheDocument();
    expect(loadProgress().missions['sfida-fine-mondo']).toMatchObject({ xp: 38, hintsUsed: 1, attempts: 2 });
  });

  it('ordina: si riordina con i pulsanti e si supera', async () => {
    const user = userEvent.setup();
    renderApp({ route: paths.missione(LIVELLO, 'struttura-corso'), progress: withLessons('benvenuto') });

    const target = ['Mondo', 'Livello', 'Lezione'];
    for (const [position, item] of target.entries()) {
      const items = screen.getAllByRole('listitem').map((li) => li.textContent ?? '');
      let current = items.findIndex((text) => text.includes(item));
      while (current > position) {
        await user.click(screen.getByRole('button', { name: `Sposta su: ${item}` }));
        current--;
      }
    }
    await user.click(screen.getByRole('button', { name: 'Verifica' }));
    expect(screen.getByText('Missione superata! +50 XP')).toBeInTheDocument();
  });

  it('scelta multipla: dice quante risposte mancano e quali sono sbagliate', async () => {
    const user = userEvent.setup();
    renderApp({
      route: paths.missione(LIVELLO, 'quando-riparti-da-zero'),
      progress: withLessons('benvenuto', 'punti-e-progressi'),
    });

    await user.click(screen.getByLabelText(/Cancelli i dati di navigazione/));
    await user.click(screen.getByLabelText(/Chiudi la scheda del corso/));
    await user.click(screen.getByRole('button', { name: 'Verifica' }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Hai scelto 1 risposta giusta.');
    expect(alert).toHaveTextContent('Ne mancano ancora 2.');
    expect(alert).toHaveTextContent(/Chiudere e riaprire la scheda non cancella nulla/);

    await user.click(screen.getByLabelText(/Chiudi la scheda del corso/));
    await user.click(screen.getByLabelText(/Apri il corso da un altro browser/));
    await user.click(screen.getByLabelText(/Studi in navigazione privata/));
    await user.click(screen.getByRole('button', { name: 'Verifica' }));
    expect(screen.getByText('Missione superata! +50 XP')).toBeInTheDocument();
  });

  it('completa: accetta la risposta scritta', async () => {
    const user = userEvent.setup();
    renderApp({
      route: paths.missione(LIVELLO, 'sito-account'),
      progress: withLessons('benvenuto', 'punti-e-progressi', 'prepararsi-ai-laboratori'),
    });

    await user.type(screen.getByLabelText('Spazio 1'), 'gitlab');
    await user.click(screen.getByRole('button', { name: 'Verifica' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Spazi completati correttamente: 0 su 1.');

    await user.clear(screen.getByLabelText('Spazio 1'));
    await user.type(screen.getByLabelText('Spazio 1'), '  github ');
    await user.click(screen.getByRole('button', { name: 'Verifica' }));
    expect(screen.getByText('Missione superata! +50 XP')).toBeInTheDocument();
  });

  it('la pagina del livello elenca le missioni con il loro stato', () => {
    renderApp({ route: paths.livello(LIVELLO), progress: withLessons('benvenuto') });
    expect(screen.getByRole('heading', { level: 2, name: 'Missioni' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /La fine di ogni mondo/ })).toBeInTheDocument();
    expect(screen.getAllByText(/si apre dopo la lezione «Prepararsi ai laboratori»/)).toHaveLength(2);
  });
});
