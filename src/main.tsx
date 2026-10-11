import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initI18n } from './i18n';
import { loadSettings } from './state/settings';
import './index.css';

const settings = loadSettings();
initI18n(settings.language);

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root mancante in index.html');

createRoot(root).render(
  <StrictMode>
    <App initialSettings={settings} />
  </StrictMode>,
);
