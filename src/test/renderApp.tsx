import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ProgressProvider } from '@/context/ProgressProvider';
import { SettingsProvider } from '@/context/SettingsProvider';
import { AppRoutes } from '@/routes/AppRoutes';
import { paths } from '@/routes/paths';
import { emptyProgress } from '@/state/progressReducer';
import type { Settings } from '@/state/settings';
import type { ProgressState } from '@/types/progress';

interface RenderAppOptions {
  route?: string;
  settings?: Settings;
  progress?: ProgressState;
}

/** Monta l'app completa (provider + rotte) partendo dall'indirizzo indicato. */
export function renderApp({
  route = paths.home,
  settings = { language: 'it', theme: 'light' },
  progress = emptyProgress(),
}: RenderAppOptions = {}) {
  return render(
    <SettingsProvider initialSettings={settings}>
      <ProgressProvider initialProgress={progress}>
        <MemoryRouter initialEntries={[route]}>
          <AppRoutes />
        </MemoryRouter>
      </ProgressProvider>
    </SettingsProvider>,
  );
}
