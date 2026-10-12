import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { loadProgress } from '@/state/progress-storage';
import { renderApp } from '@/test/renderApp';
import { paths } from './paths';

describe('Mappa, livelli e lezioni', () => {
  it('all\'inizio è aperto solo il Livello 0', () => {
    renderApp({ route: paths.mappa });
    expect(screen.getByRole('link', { name: /Livello 0 · disponibile/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Livello 1 ·/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Livello 1 · bloccato/)).toBeInTheDocument();
    expect(screen.getByText(/Livello 2 · bloccato/)).toBeInTheDocument();
    expect(screen.getByText(/Livello 3 · in preparazione/)).toBeInTheDocument();
  });

  it('si legge una lezione, si guadagnano XP e si passa alla sua missione', async () => {
    const user = userEvent.setup();
    renderApp({ route: paths.livello('come-funziona') });

    expect(screen.getByRole('heading', { level: 1, name: 'Come funziona questo corso' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Inizia il livello' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Benvenuto a bordo' })).toBeInTheDocument();
    // Il testo della lezione viene caricato separatamente.
    expect(await screen.findByRole('heading', { level: 2, name: 'Perché questo corso' })).toBeInTheDocument();

    // Dopo la lezione si passa alla sua prima missione.
    await user.click(screen.getByRole('button', { name: /Ho letto, alla missione \(\+10 XP\)/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'La fine di ogni mondo' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mozzo\s*10 XP/ })).toBeInTheDocument();
    expect(Object.keys(loadProgress().lessonsRead)).toEqual(['benvenuto']);
  });

  it('una parola del glossario mostra la definizione', async () => {
    const user = userEvent.setup();
    renderApp({ route: paths.lezione('come-funziona', 'punti-e-progressi') });

    const term = await screen.findByRole('button', { name: 'archiviazione locale' });
    await user.click(term);

    const note = screen.getByRole('note');
    expect(within(note).getByText(/piccolo spazio che il browser riserva/)).toBeInTheDocument();
    expect(term).toHaveAttribute('aria-expanded', 'true');
  });

  it('a fine lezione mostra le fonti ufficiali', async () => {
    renderApp({ route: paths.lezione('come-funziona', 'prepararsi-ai-laboratori') });
    expect(
      await screen.findByRole('link', { name: 'GitHub Docs – GitHub Codespaces billing' }),
    ).toHaveAttribute('href', 'https://docs.github.com/en/billing/concepts/product-billing/github-codespaces');
  });

  it('un livello bloccato spiega perché non si può entrare', () => {
    renderApp({ route: paths.livello('computer') });
    expect(screen.getByText(/si sblocca quando completi quello precedente/)).toBeInTheDocument();
    expect(
      screen.getByText('Per sbloccarlo completa il Livello 0 «Come funziona questo corso». Ti mancano: lezioni da leggere 3, missioni da superare 6.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vai al Livello 0' })).toBeInTheDocument();
  });

  it('un livello senza contenuti dice che è in preparazione', () => {
    renderApp({ route: paths.livello('linux') });
    expect(screen.getByText(/ancora in preparazione/)).toBeInTheDocument();
  });

  it('il glossario elenca le parole introdotte', () => {
    renderApp({ route: paths.glossario });
    expect(screen.getByRole('heading', { level: 1, name: 'Glossario' })).toBeInTheDocument();
    expect(screen.getByText('GitHub Codespaces')).toBeInTheDocument();
    expect(screen.getByText('Cloud')).toBeInTheDocument();
  });
});
