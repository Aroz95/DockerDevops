import { HashRouter } from 'react-router';
import { SettingsProvider } from '@/context/SettingsProvider';
import { AppRoutes } from '@/routes/AppRoutes';
import type { Settings } from '@/state/settings';

interface AppProps {
  initialSettings: Settings;
}

/**
 * HashRouter: gli indirizzi sono del tipo /#/mappa.
 * GitHub Pages non sa reindirizzare le rotte di una single-page app,
 * mentre con l'hash ricaricare la pagina o aprire un link diretto funziona sempre.
 */
export function App({ initialSettings }: AppProps) {
  return (
    <SettingsProvider initialSettings={initialSettings}>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </SettingsProvider>
  );
}
