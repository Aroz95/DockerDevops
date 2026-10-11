import { Route, Routes } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { HomePage } from './HomePage';
import { MappaMondiPage } from './MappaMondiPage';
import { NotFoundPage } from './NotFoundPage';
import { paths } from './paths';

/** Elenco delle pagine. Le nuove rotte (livello, lezione, missione…) si aggiungono qui. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path={paths.mappa} element={<MappaMondiPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
