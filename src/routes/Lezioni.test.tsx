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
    expect(screen.getByText(/Livello 1 · in preparazione/)).toBeInTheDocument();
  });

  it('si legge una lezione, si guadagnano XP e si passa alla successiva', async () => {
    const user = userEvent.setup();
    renderApp({ route: paths.livello('come-funziona') });

    expect(screen.getByRole('heading', { level: 1, name: 'Come funziona questo corso' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Inizia il livello' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Benvenuto a bordo' })).toBeInTheDocument();
    // Il testo della lezione viene caricato separatamente.
    expect(await screen.findByRole('heading', { level: 2, name: 'Perché questo corso' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Ho letto, avanti \(\+10 XP\)/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: /Punti, gradi e dove finiscono/ }),
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
    expect(screen.getByText(/ancora in preparazione/)).toBeInTheDocument();
  });

  it('il glossario elenca le parole introdotte', () => {
    renderApp({ route: paths.glossario });
    expect(screen.getByRole('heading', { level: 1, name: 'Glossario' })).toBeInTheDocument();
    expect(screen.getByText('GitHub Codespaces')).toBeInTheDocument();
    expect(screen.getByText('Cloud')).toBeInTheDocument();
  });
});
