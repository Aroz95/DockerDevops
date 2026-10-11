import { useTranslation } from 'react-i18next';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Card } from '@/components/ui/Card';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { paths } from './paths';

const FEATURES = ['fromZero', 'missions', 'local'] as const;

export function HomePage() {
  const { t } = useTranslation();
  useDocumentTitle();

  return (
    <div className="space-y-14">
      <section className="max-w-3xl space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-balance text-slate-900 sm:text-5xl dark:text-white">
          {t('home.title')}
        </h1>
        <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          {t('home.intro')}
        </p>
        <ButtonLink to={paths.mappa}>{t('home.cta')}</ButtonLink>
      </section>

      <section aria-labelledby="come-funziona" className="space-y-5">
        <h2
          id="come-funziona"
          className="text-sm font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400"
        >
          {t('home.features.title')}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card as="li" key={feature}>
              <h3 className="mb-2 font-bold text-slate-900 dark:text-white">
                {t(`home.features.${feature}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {t(`home.features.${feature}.text`)}
              </p>
            </Card>
          ))}
        </ul>
      </section>
    </div>
  );
}
