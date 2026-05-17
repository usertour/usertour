import { useGlobalConfigQuery } from '@usertour/hooks';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface SignUpPromptProps {
  prefix?: string;
  label?: string;
  className?: string;
}

export const SignUpPrompt = ({
  prefix,
  label,
  className = 'text-center text-sm text-muted-foreground',
}: SignUpPromptProps) => {
  const { t } = useTranslation('ui');
  const { data, loading } = useGlobalConfigQuery();

  if (loading || data?.allowUserRegistration === false || data?.needsSystemAdminSetup === true) {
    return null;
  }

  return (
    <div className={className}>
      {prefix ?? t('auth.signIn.noAccountPrompt')}{' '}
      <Link to="/auth/signup" className="underline underline-offset-4 hover:text-primary">
        {label ?? t('auth.signIn.signUpCta')}
      </Link>
    </div>
  );
};

SignUpPrompt.displayName = 'SignUpPrompt';
