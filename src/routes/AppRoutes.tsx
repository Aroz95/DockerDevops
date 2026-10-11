import { Route, Routes } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { GlossarioPage } from './GlossarioPage';
import { HomePage } from './HomePage';
import { LezionePage } from './LezionePage';
import { LivelloPage } from './LivelloPage';
import { MappaMondiPage } from './MappaMondiPage';
import { MissionePage } from './MissionePage';
import { NotFoundPage } from './NotFoundPage';
import { PalestraPage } from './PalestraPage';
import { paths } from './paths';
import { ProfiloPage } from './ProfiloPage';

/** Elenco delle pagine. Le nuove rotte (missione, boss…) si aggiungono qui. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path={paths.mappa} element={<MappaMondiPage />} />
        <Route path={paths.livelloPattern} element={<LivelloPage />} />
        <Route path={paths.lezionePattern} element={<LezionePage />} />
        <Route path={paths.missionePattern} element={<MissionePage />} />
        <Route path={paths.glossario} element={<GlossarioPage />} />
        <Route path={paths.palestra} element={<PalestraPage />} />
        <Route path={paths.profilo} element={<ProfiloPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
