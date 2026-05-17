import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGetInviteQuery, useGlobalConfigQuery } from '@usertour/hooks';
import { AuthCard } from './components/auth-card';
import { SignInForm } from './components/sign-in-form';
import { SignUpForm } from './components/registration-form';

type InviteMode = 'signin' | 'signup';

const InviteTitle = ({ inviteCode }: { inviteCode: string }) => {
  const { t } = useTranslation('ui');
  const { data } = useGetInviteQuery(inviteCode);
  return (
    <>
      <p className="text-lg font-normal">
        {t('auth.invite.titleTemplate', {
          userName: data?.user?.name ?? '',
          projectName: data?.project?.name ?? '',
        })}
      </p>
      <p className="text-sm text-muted-foreground">{t('auth.invite.subtitle')}</p>
    </>
  );
};

const ToggleFooter = ({
  prompt,
  cta,
  onClick,
}: {
  prompt: string;
  cta: string;
  onClick: () => void;
}) => (
  <div className="text-center text-sm text-muted-foreground">
    {prompt}{' '}
    <button
      type="button"
      className="underline underline-offset-4 hover:text-primary cursor-pointer"
      onClick={onClick}
    >
      {cta}
    </button>
  </div>
);

export const Invite = () => {
  const { t } = useTranslation('ui');
  const { inviteCode } = useParams();
  const [mode, setMode] = useState<InviteMode>('signin');
  const { data: globalConfig } = useGlobalConfigQuery();

  if (!inviteCode) {
    return null;
  }

  const footer =
    mode === 'signin' ? (
      <ToggleFooter
        prompt={t('auth.invite.toSignUpPrompt')}
        cta={t('auth.invite.toSignUpCta')}
        onClick={() => setMode('signup')}
      />
    ) : (
      <ToggleFooter
        prompt={t('auth.invite.toSignInPrompt')}
        cta={t('auth.invite.toSignInCta')}
        onClick={() => setMode('signin')}
      />
    );

  return (
    <AuthCard title={<InviteTitle inviteCode={inviteCode} />} footer={footer}>
      {mode === 'signin' ? (
        <SignInForm
          globalConfig={globalConfig}
          inviteCode={inviteCode}
          buttonText={t('auth.invite.signInButton')}
        />
      ) : (
        <SignUpForm inviteCode={inviteCode} buttonText={t('auth.invite.signUpButton')} />
      )}
    </AuthCard>
  );
};

Invite.displayName = 'Invite';
