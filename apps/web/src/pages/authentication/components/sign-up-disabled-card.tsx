import { useTranslation } from 'react-i18next';
import { Button } from '@usertour/ui';
import { Link } from 'react-router-dom';
import { AuthCard } from './auth-card';

export const SignUpDisabledCard = () => {
  const { t } = useTranslation('ui');
  return (
    <AuthCard
      title={t('auth.magicLink.disabled.title')}
      footer={
        <Button asChild variant="outline">
          <Link to="/auth/signin">{t('auth.magicLink.disabled.backToSignIn')}</Link>
        </Button>
      }
    >
      <div className="text-center text-sm text-muted-foreground">
        {t('auth.magicLink.disabled.description')}
      </div>
    </AuthCard>
  );
};

SignUpDisabledCard.displayName = 'SignUpDisabledCard';
