import { useTranslation } from 'react-i18next';
import { AuthCard } from './auth-card';
import { SignUpPrompt } from './sign-up-link';

interface ResetPasswordSuccessProps {
  /**
   * Called when the user clicks "Back to sign in". The owner page resets
   * its own view state — this component does not navigate.
   */
  onBack: () => void;
  /**
   * Defaults to true on the standalone sign-in surface; pass false on the
   * invite surface where promoting sign-up doesn't fit the flow.
   */
  showSignUpPrompt?: boolean;
}

export const ResetPasswordSuccess = ({
  onBack,
  showSignUpPrompt = true,
}: ResetPasswordSuccessProps) => {
  const { t } = useTranslation('ui');
  return (
    <AuthCard
      title={t('auth.resetPassword.success.title')}
      description={t('auth.resetPassword.success.description')}
      footer={
        <>
          <div className="pt-4 text-center text-sm text-muted-foreground">
            <button
              type="button"
              onClick={onBack}
              className="underline underline-offset-4 hover:text-primary cursor-pointer"
            >
              {t('auth.resetPassword.backToSignIn')}
            </button>
          </div>
          {showSignUpPrompt && (
            <SignUpPrompt className="pt-4 text-center text-sm text-muted-foreground" />
          )}
        </>
      }
    />
  );
};

ResetPasswordSuccess.displayName = 'ResetPasswordSuccess';
