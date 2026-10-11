import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SettingsProvider } from '@/context/SettingsProvider';
import { AppRoutes } from '@/routes/AppRoutes';
import { paths } from '@/routes/paths';
import { loadSettings, type Settings } from '@/state/settings';

function renderApp(route: string = paths.home, settings: Settings = { language: 'it', theme: 'light' }) {
  return render(
    <SettingsProvider initialSettings={settings}>
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes />
      </MemoryRouter>
    </SettingsProvider>,
  );
}

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

  it('mostra la pagina "non trovata" per indirizzi sconosciuti', () => {
    renderApp('/indirizzo-inesistente');
    expect(screen.getByRole('heading', { name: 'Pagina non trovata' })).toBeInTheDocument();
  });
});
