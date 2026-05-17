import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@usertour/button';

export const NotFound = () => {
  const { t } = useTranslation('ui');
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-semibold tracking-tight">404</p>
      <p className="text-sm text-muted-foreground">
        {t('notFound.description', { defaultValue: "We couldn't find that page." })}
      </p>
      <Button asChild>
        <Link to="/">{t('notFound.backHome', { defaultValue: 'Back to home' })}</Link>
      </Button>
    </div>
  );
};

NotFound.displayName = 'NotFound';
