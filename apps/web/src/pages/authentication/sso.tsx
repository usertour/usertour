import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@usertour/ui';
import { RiShieldKeyholeLine, SpinnerIcon } from '@usertour/icons';
import { useGetProjectSsoLoginQuery } from '@usertour/hooks';
import { apiUrl } from '@/utils/env';
import { AuthCard } from './components/auth-card';

// Per-project SSO entry page. Resolves the project's branding + active providers
// (public query, gated server-side by the project's OIDC entitlement) and hands
// off to the server's SP-initiated flow. The project context comes from the URL,
// so no email-first routing is needed in v1.
const SsoLogin = () => {
  const { t } = useTranslation('ui');
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const { name, logoUrl, providers, loading } = useGetProjectSsoLoginQuery(projectId);

  // Set by the server when a callback fails (e.g. the IdP authenticated the user
  // but they aren't allowed into the project) — show it instead of a bare 500.
  const error = searchParams.get('error');

  const launch = (providerId: string) => {
    window.location.href = `${apiUrl}/api/auth/sso/${providerId}`;
  };

  // Lead with the project's branding so the page reads as "sign in to <project>"
  // rather than a generic, floating SSO card.
  const title = (
    <div className="flex flex-col items-center gap-3">
      {logoUrl && <img src={logoUrl} alt="" className="h-12 w-12 rounded-xl object-contain" />}
      <span>{name ? t('auth.sso.titleNamed', { name }) : t('auth.sso.title')}</span>
    </div>
  );

  return (
    <AuthCard title={title} description={t('auth.sso.description')}>
      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error === 'access_denied'
            ? t('auth.sso.error.accessDenied')
            : t('auth.sso.error.failed')}
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-6">
          <SpinnerIcon className="w-5 h-5 animate-spin" />
        </div>
      ) : providers.length === 0 ? (
        <p className="py-2 text-center text-sm text-muted-foreground">
          {t('auth.sso.unavailable')}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {providers.map((provider) => (
            <Button
              key={provider.id}
              variant="outline"
              className="w-full"
              type="button"
              onClick={() => launch(provider.id)}
            >
              <RiShieldKeyholeLine className="mr-2 h-4 w-4" />
              {t('auth.sso.continueWith', { name: provider.name })}
            </Button>
          ))}
        </div>
      )}
    </AuthCard>
  );
};

SsoLogin.displayName = 'SsoLogin';

export { SsoLogin };
