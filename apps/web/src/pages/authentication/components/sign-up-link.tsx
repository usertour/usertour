import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAppContext } from '@/contexts/app-context';

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
  // Read globalConfig from AppContext (single source) instead of a second
  // query, so this renders in lockstep with the card. The `!globalConfig`
  // guard keeps the old "don't show until config is known" safety for any
  // surface not already gated by AuthGuard.
  const { globalConfig } = useAppContext();

  if (
    !globalConfig ||
    globalConfig.allowUserRegistration === false ||
    globalConfig.needsSystemAdminSetup === true
  ) {
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
