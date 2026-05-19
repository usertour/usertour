import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGetInviteQuery, useGlobalConfigQuery } from '@usertour/hooks';
import { AuthCard } from './components/auth-card';
import { SignInForm } from './components/sign-in-form';
import { SignUpForm } from './components/registration-form';
import { ResetPasswordForm } from './components/reset-password-form';
import { ResetPasswordSuccess } from './components/reset-password-success';

type View = 'main' | 'forgot' | 'forgotSuccess';

export const Invite = () => {
  const { t } = useTranslation('ui');
  const { inviteCode } = useParams();
  const { data: globalConfig, loading: globalConfigLoading } = useGlobalConfigQuery();
  const { data: invite, loading } = useGetInviteQuery(inviteCode ?? '');
  const [view, setView] = useState<View>('main');

  if (!inviteCode) {
    return null;
  }

  // Wait for both the invite lookup and globalConfig before rendering — the
  // latter governs which OAuth buttons SocialProviders shows, so rendering
  // early would flash "all enabled" before self-host config narrows it.
  if (loading || globalConfigLoading) {
    return <AuthCard title={t('auth.invite.expiredTitle')} loading />;
  }

  if (!invite) {
    return (
      <AuthCard
        title={t('auth.invite.expiredTitle')}
        description={t('auth.invite.expiredDescription')}
      />
    );
  }

  // Forgot-password subview — only reachable from the sign-in branch (the
  // sign-up branch has no existing password). Stays at /auth/invite/<code>;
  // submitting the form sends a reset email and swaps to the success view,
  // Back returns to the sign-in form.
  if (view === 'forgot') {
    return (
      <AuthCard
        title={t('auth.resetPassword.title')}
        description={t('auth.resetPassword.description')}
      >
        <ResetPasswordForm
          fixedEmail={invite.email}
          onBack={() => setView('main')}
          onSuccess={() => setView('forgotSuccess')}
        />
      </AuthCard>
    );
  }

  if (view === 'forgotSuccess') {
    return <ResetPasswordSuccess onBack={() => setView('main')} showSignUpPrompt={false} />;
  }

  // Server-side recipientExists collapses the page to a single branch — no
  // toggle, no session-state special case. Submitting either form passes the
  // inviteCode through login/signup; the server matches the actor's email
  // against the invite email before consuming it.
  const title = (
    <>
      <p className="text-lg font-normal">
        {t('auth.invite.titleTemplate', {
          userName: invite.user?.name ?? '',
          projectName: invite.project?.name ?? '',
        })}
      </p>
      <p className="text-sm text-muted-foreground">
        {invite.recipientExists
          ? t('auth.invite.signInDescription')
          : t('auth.invite.signUpDescription')}
      </p>
    </>
  );

  return (
    <AuthCard title={title}>
      {invite.recipientExists ? (
        <SignInForm
          globalConfig={globalConfig}
          inviteCode={inviteCode}
          fixedEmail={invite.email}
          buttonText={t('auth.invite.joinButton')}
          onForgotPassword={() => setView('forgot')}
        />
      ) : (
        <SignUpForm
          inviteCode={inviteCode}
          fixedEmail={invite.email}
          buttonText={t('auth.invite.joinButton')}
        />
      )}
    </AuthCard>
  );
};

Invite.displayName = 'Invite';
