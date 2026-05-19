import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobalConfigQuery } from '@usertour/hooks';
import { AuthCard } from './components/auth-card';
import { SignInForm } from './components/sign-in-form';
import { SignUpPrompt } from './components/sign-up-link';
import { ResetPasswordForm } from './components/reset-password-form';
import { ResetPasswordSuccess } from './components/reset-password-success';

type View = 'signin' | 'forgot' | 'forgotSuccess';

const SignIn = () => {
  const { t } = useTranslation('ui');
  const { data: globalConfig, loading: globalConfigLoading } = useGlobalConfigQuery();
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

  // Defer rendering the real form until globalConfig is known — otherwise
  // SocialProviders renders OAuth buttons under the "no providers list = all
  // enabled" default and they disappear once self-host config arrives.
  if (globalConfigLoading) {
    return <AuthCard title={t('auth.signIn.title')} loading footer={<SignUpPrompt />} />;
  }

  return (
    <AuthCard title={t('auth.signIn.title')} footer={<SignUpPrompt />}>
      <SignInForm globalConfig={globalConfig} onForgotPassword={() => setView('forgot')} />
    </AuthCard>
  );
};

SignIn.displayName = 'SignIn';

export { SignIn };
