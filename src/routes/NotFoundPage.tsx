import { useTranslation } from 'react-i18next';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { paths } from './paths';

export function NotFoundPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('notFound.title'));

  return (
    <section className="max-w-xl space-y-4">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
        {t('notFound.title')}
      </h1>
      <p className="text-slate-600 dark:text-slate-300">{t('notFound.text')}</p>
      <ButtonLink to={paths.home} variant="secondary">
        {t('notFound.back')}
      </ButtonLink>
    </section>
  );
}
