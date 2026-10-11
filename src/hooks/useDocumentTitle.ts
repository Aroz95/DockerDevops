import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/** Imposta il titolo della scheda del browser: "<pagina> · Docker & DevOps". */
export function useDocumentTitle(pageTitle?: string): void {
  const { t } = useTranslation();
  const appName = t('app.name');

  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · ${appName}` : appName;
  }, [pageTitle, appName]);
}
