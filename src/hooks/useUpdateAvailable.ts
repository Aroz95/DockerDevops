import { useEffect, useState } from 'react';

/**
 * true quando sul server c'è una versione del sito più recente di quella in uso.
 * Serve soprattutto a chi apre il corso dalla schermata Home del telefono: lì la pagina
 * può restare aperta per giorni senza mai ricaricarsi.
 */
export function useUpdateAvailable(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (__APP_VERSION__ === 'dev') return;
    let cancelled = false;

    const check = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const data = (await response.json()) as { version?: string };
        if (!cancelled && data.version && data.version !== __APP_VERSION__) setAvailable(true);
      } catch {
        // offline o rete assente: si riproverà al prossimo ritorno sulla pagina
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };

    void check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return available;
}
