import { useTranslation } from 'react-i18next';
import { useGlobalConfigQuery } from '@usertour/hooks';
import { AuthCard } from './components/auth-card';
import { SignInForm } from './components/sign-in-form';
import { SignUpPrompt } from './components/sign-up-link';

const SignIn = () => {
  const { t } = useTranslation('ui');
  const { data: globalConfig } = useGlobalConfigQuery();
  return (
    <AuthCard title={t('auth.signIn.title')} footer={<SignUpPrompt />}>
      <SignInForm globalConfig={globalConfig} />
    </AuthCard>
  );
};

SignIn.displayName = 'SignIn';

export { SignIn };
