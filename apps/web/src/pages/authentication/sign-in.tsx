import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { AuthCard } from './components/auth-card';
import { SignInForm } from './components/sign-in-form';
import { SignUpPrompt } from './components/sign-up-link';
import { ResetPasswordForm } from './components/reset-password-form';
import { ResetPasswordSuccess } from './components/reset-password-success';

type View = 'signin' | 'forgot' | 'forgotSuccess';

const SignIn = () => {
  const { t } = useTranslation('ui');
  // globalConfig is read from AppContext, not a second query: AuthGuard already
  // blocks this route until globalConfig has loaded, so it is guaranteed present
  // here. That makes a local loading gate redundant.
  const { globalConfig } = useAppContext();
  const [view, setView] = useState<View>('signin');

  if (view === 'forgot') {
    return (
      <AuthCard
        title={t('auth.resetPassword.title')}
        description={t('auth.resetPassword.description')}
        footer={<SignUpPrompt className="pt-4 text-center text-sm text-muted-foreground" />}
      >
        <ResetPasswordForm
          onBack={() => setView('signin')}
          onSuccess={() => setView('forgotSuccess')}
        />
      </AuthCard>
    );
  }

  if (view === 'forgotSuccess') {
    return <ResetPasswordSuccess onBack={() => setView('signin')} />;
  }

  return (
    <AuthCard title={t('auth.signIn.title')} footer={<SignUpPrompt />}>
      <SignInForm globalConfig={globalConfig} onForgotPassword={() => setView('forgot')} />
    </AuthCard>
  );
};

SignIn.displayName = 'SignIn';

export { SignIn };
