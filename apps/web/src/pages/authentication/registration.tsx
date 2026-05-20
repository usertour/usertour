import { useTranslation } from 'react-i18next';
import { AuthCard } from './components/auth-card';
import { SignUpForm } from './components/registration-form';

const Registration = () => {
  const { t } = useTranslation('ui');
  return (
    <AuthCard title={t('auth.signUp.title')}>
      <SignUpForm />
    </AuthCard>
  );
};

Registration.displayName = 'Registration';

export { Registration };
