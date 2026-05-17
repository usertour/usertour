import { useTranslation } from 'react-i18next';
import { Button } from '@usertour/button';
import { useResendMagicLinkMutation } from '@usertour/hooks';
import { useToast } from '@usertour/use-toast';
import { SpinnerIcon } from '@usertour/icons';
import { getErrorMessage } from '@usertour/helpers';
import { AuthCard } from './auth-card';

export type SignUpSuccessProps = {
  registerId: string;
  email: string;
};

export const SignUpSuccess = ({ registerId, email }: SignUpSuccessProps) => {
  const { t } = useTranslation('ui');
  const { invoke: resend, loading } = useResendMagicLinkMutation();
  const { toast } = useToast();

  const onResend = async () => {
    try {
      const result = await resend(registerId);
      if (!result?.id) {
        toast({ variant: 'destructive', title: t('auth.errors.genericFailure') });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <AuthCard
      title={t('auth.magicLink.success.title')}
      description={
        <>
          {t('auth.magicLink.success.descriptionPrefix')} <br />
          {email}
        </>
      }
      footer={
        <Button className="w-full" onClick={onResend} disabled={loading}>
          {loading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
          {t('auth.magicLink.success.resendButton')}
        </Button>
      }
    />
  );
};

SignUpSuccess.displayName = 'SignUpSuccess';
