import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@usertour/ui';
import { GithubIcon, GoogleIcon, SpinnerIcon } from '@usertour/icons';
import { apiUrl } from '@/utils/env';

export type AuthProvider = 'github' | 'google';

interface SocialProvidersProps {
  googleEnabled: boolean;
  githubEnabled: boolean;
  emailEnabled: boolean;
  inviteCode?: string;
}

// `next` rides along so the server can thread it through the OAuth state
// round-trip and land the callback back on the interrupted flow (e.g. the MCP
// consent page). Without it, a social login always ended on the homepage and
// silently killed whatever needed the login. Same-origin validation happens
// server-side; this only forwards.
const buildHref = (provider: AuthProvider, inviteCode?: string, next?: string | null) => {
  const params = new URLSearchParams();
  if (inviteCode) {
    params.set('inviteCode', inviteCode);
  }
  if (next?.startsWith('/') && !next.startsWith('//')) {
    params.set('next', next);
  }
  const qs = params.toString();
  return `${apiUrl}/api/auth/${provider}${qs ? `?${qs}` : ''}`;
};

export const SocialProviders = ({
  googleEnabled,
  githubEnabled,
  emailEnabled,
  inviteCode,
}: SocialProvidersProps) => {
  const { t } = useTranslation('ui');
  const [pending, setPending] = useState<AuthProvider | null>(null);
  const [searchParams] = useSearchParams();

  if (!googleEnabled && !githubEnabled) {
    return null;
  }

  const launch = (provider: AuthProvider) => {
    setPending(provider);
    window.location.href = buildHref(provider, inviteCode, searchParams.get('next'));
  };

  return (
    <>
      <div className="flex flex-col gap-2 w-full">
        {googleEnabled && (
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() => launch('google')}
            disabled={pending === 'google'}
          >
            {pending === 'google' && <SpinnerIcon className="w-4 h-4 animate-spin mr-1" />}
            <GoogleIcon className="w-4 h-4 mr-2" />
            {pending === 'google'
              ? t('auth.social.signingIn')
              : t('auth.social.continueWithGoogle')}
          </Button>
        )}
        {githubEnabled && (
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() => launch('github')}
            disabled={pending === 'github'}
          >
            {pending === 'github' && <SpinnerIcon className="w-4 h-4 animate-spin mr-1" />}
            <GithubIcon className="w-4 h-4 mr-2" />
            {pending === 'github'
              ? t('auth.social.signingIn')
              : t('auth.social.continueWithGithub')}
          </Button>
        )}
      </div>
      {emailEnabled && <SocialProvidersDivider />}
    </>
  );
};

SocialProviders.displayName = 'SocialProviders';

const SocialProvidersDivider = () => {
  const { t } = useTranslation('ui');
  return (
    <div className="relative w-full">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-sm leading-5">
        <span className="px-2 font-medium bg-white text-background-accent dark:text-foreground/60 dark:bg-background">
          {t('auth.social.divider')}
        </span>
      </div>
    </div>
  );
};

SocialProvidersDivider.displayName = 'SocialProvidersDivider';
