import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  useGetInviteQuery,
  useGetProjectSsoProvidersQuery,
  useGlobalConfigQuery,
} from '@usertour/hooks';
import { NotFound } from '@/routes/not-found';
import { AuthCard } from './components/auth-card';
import { SsoProviderButtons } from './components/sso-provider-buttons';
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
  // Active SSO providers of the inviting project. Signing in through one
  // consumes the pending invite server-side (AuthService.ssoValidate), so an
  // SSO-only user can accept without a password.
  const { providers: ssoProviders, loading: ssoLoading } = useGetProjectSsoProvidersQuery(
    invite?.project?.id,
  );
  const [view, setView] = useState<View>('main');

  // Route `/auth/invite/:inviteCode` guarantees the path param; fall
  // back to NotFound for the edge case where it somehow isn't there.
  if (!inviteCode) {
    return <NotFound />;
  }

  // Wait for both the invite lookup and globalConfig before rendering — the
  // latter governs which OAuth buttons SocialProviders shows, so rendering
  // early would flash "all enabled" before self-host config narrows it.
  // Wait for the SSO providers too: they load in a second round-trip (keyed on
  // the invite's projectId), and rendering before they arrive briefly shows the
  // full form when the project actually enforces SSO (only-SSO) — a flash.
  if (loading || globalConfigLoading || ssoLoading) {
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

  // Forgot-password subview — only reachable from the log-in branch (the
  // sign-up branch has no existing password). Stays at /auth/invite/<code>;
  // submitting the form sends a reset email and swaps to the success view,
  // Back returns to the log-in form.
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

  // When the project enforces SSO (and SSO is actually usable), password/social
  // login would be force-blocked after joining, so show only the SSO option.
  const forceSso = !!invite.requireSso && ssoProviders.length > 0;

  return (
    // gap-2 so the SSO button(s) line up evenly with the social buttons below
    // (8px), forming one button group; SignInForm's own divider separates them
    // from the email form.
    <AuthCard title={title} contentClassName="grid gap-2">
      {ssoProviders.length > 0 && <SsoProviderButtons providers={ssoProviders} />}
      {forceSso ? (
        <p className="pt-1 text-center text-sm text-muted-foreground">
          {t('auth.invite.requireSsoNote')}
        </p>
      ) : invite.recipientExists ? (
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
