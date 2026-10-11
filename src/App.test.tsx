import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { loadSettings } from '@/state/settings';
import { renderApp } from '@/test/renderApp';

describe('App', () => {
  it('mostra la pagina iniziale in italiano', () => {
    renderApp();
    expect(
      screen.getByRole('heading', { level: 1, name: /Impara Docker e DevOps/ }),
    ).toBeInTheDocument();
  });

  it('cambia lingua e la ricorda', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: 'en' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: /Learn Docker and DevOps/ }),
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(loadSettings().language).toBe('en');
  });

  it('applica il tema scuro alla pagina', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.selectOptions(screen.getByLabelText('Tema'), 'dark');

    expect(document.documentElement).toHaveClass('dark');
    expect(loadSettings().theme).toBe('dark');
  });

  it('dalla home si arriva alla mappa con tutti i mondi', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('link', { name: 'Vai alla mappa del corso' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Mappa del corso' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(7);
    expect(screen.getByRole('heading', { level: 2, name: 'Campo Base' })).toBeInTheDocument();
  });

  it('mostra grado e XP nell\'intestazione', () => {
    renderApp();
    expect(screen.getByRole('link', { name: /Mozzo\s*0 XP/ })).toBeInTheDocument();
  });

  it('mostra la pagina "non trovata" per indirizzi sconosciuti', () => {
    renderApp({ route: '/indirizzo-inesistente' });
    expect(screen.getByRole('heading', { name: 'Pagina non trovata' })).toBeInTheDocument();
  });
});
