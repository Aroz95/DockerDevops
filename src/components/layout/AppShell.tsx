import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';
import { Footer } from './Footer';
import { Header } from './Header';
import { UpdateBanner } from './UpdateBanner';

const MAIN_ID = 'contenuto';

/** Cornice comune a tutte le pagine: intestazione, contenuto, piè di pagina. */
export function AppShell() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  // Cambiando pagina si riparte dall'alto, come in un sito tradizionale.
  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href={`#${MAIN_ID}`}
        onClick={(event) => {
          // Con HashRouter un normale link "#id" cambierebbe pagina: spostiamo solo il focus.
          event.preventDefault();
          document.getElementById(MAIN_ID)?.focus();
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-teal-600 focus:px-3 focus:py-2 focus:text-white"
      >
        {t('app.skipToContent')}
      </a>
      <UpdateBanner />
      <Header />
      <main id={MAIN_ID} tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
