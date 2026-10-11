import { useTranslation } from 'react-i18next';
import { MondoCard } from '@/components/mappa/MondoCard';
import { useCourse } from '@/hooks/useCourse';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function MappaMondiPage() {
  const { t } = useTranslation();
  const { mondi, levels } = useCourse();
  useDocumentTitle(t('map.title'));

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
          <MondoCard
            key={mondo.id}
            mondo={mondo}
            levels={levels.filter((level) => level.mondo.id === mondo.id)}
          />
        ))}
      </div>
    </div>
  );
}
