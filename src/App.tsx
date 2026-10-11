import { HashRouter } from 'react-router';
import { ProgressProvider } from '@/context/ProgressProvider';
import { SettingsProvider } from '@/context/SettingsProvider';
import { AppRoutes } from '@/routes/AppRoutes';
import type { Settings } from '@/state/settings';
import type { ProgressState } from '@/types/progress';

interface AppProps {
  initialSettings: Settings;
  initialProgress: ProgressState;
}

/**
 * HashRouter: gli indirizzi sono del tipo /#/mappa.
 * GitHub Pages non sa reindirizzare le rotte di una single-page app,
 * mentre con l'hash ricaricare la pagina o aprire un link diretto funziona sempre.
 */
export function App({ initialSettings, initialProgress }: AppProps) {
  return (
    <SettingsProvider initialSettings={initialSettings}>
      <ProgressProvider initialProgress={initialProgress}>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </ProgressProvider>
    </SettingsProvider>
  );
}
