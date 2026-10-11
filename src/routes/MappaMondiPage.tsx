import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MondoCard } from '@/components/mappa/MondoCard';
import { getMondi } from '@/content';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSettings } from '@/hooks/useSettings';

export function MappaMondiPage() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  useDocumentTitle(t('map.title'));

  const mondi = useMemo(() => getMondi(settings.language), [settings.language]);

  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t('map.title')}
        </h1>
        <p className="text-slate-600 dark:text-slate-300">{t('map.intro')}</p>
      </header>

      <div className="space-y-6">
        {mondi.map((mondo) => (
          <MondoCard key={mondo.id} mondo={mondo} />
        ))}
      </div>
    </div>
  );
}
