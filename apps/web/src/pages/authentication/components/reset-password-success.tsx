import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AuthCard } from './auth-card';
import { SignUpPrompt } from './sign-up-link';

export const ResetPasswordSuccess = () => {
  const { t } = useTranslation('ui');
  return (
    <AuthCard
      title={t('auth.resetPassword.success.title')}
      description={t('auth.resetPassword.success.description')}
      footer={
        <>
          <div className="pt-4 text-center text-sm text-muted-foreground">
            <Link to="/auth/signin" className="underline underline-offset-4 hover:text-primary">
              {t('auth.resetPassword.backToSignIn')}
            </Link>
          </div>
          <SignUpPrompt className="pt-4 text-center text-sm text-muted-foreground" />
        </>
      }
    />
  );
};

ResetPasswordSuccess.displayName = 'ResetPasswordSuccess';
