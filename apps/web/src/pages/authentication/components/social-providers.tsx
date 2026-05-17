import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@usertour/button';
import { GithubIcon, GoogleIcon, SpinnerIcon } from '@usertour/icons';
import { apiUrl } from '@/utils/env';

export type AuthProvider = 'github' | 'google';

interface SocialProvidersProps {
  googleEnabled: boolean;
  githubEnabled: boolean;
  emailEnabled: boolean;
  inviteCode?: string;
}

const buildHref = (provider: AuthProvider, inviteCode?: string) =>
  inviteCode
    ? `${apiUrl}/api/auth/${provider}?inviteCode=${inviteCode}`
    : `${apiUrl}/api/auth/${provider}`;

export const SocialProviders = ({
  googleEnabled,
  githubEnabled,
  emailEnabled,
  inviteCode,
}: SocialProvidersProps) => {
  const { t } = useTranslation('ui');
  const [pending, setPending] = useState<AuthProvider | null>(null);

  if (!googleEnabled && !githubEnabled) {
    return null;
  }

  const launch = (provider: AuthProvider) => {
    setPending(provider);
    window.location.href = buildHref(provider, inviteCode);
  };

  return (
    <>
      <div className="flex flex-row gap-2 w-full">
        {googleEnabled && (
          <Button
            variant="outline"
            className="flex-1"
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
            className="flex-1"
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
        <div className="w-full border-t border-gray-100 text-gray-50 dark:border-border" />
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
