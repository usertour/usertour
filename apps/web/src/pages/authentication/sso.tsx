import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { SpinnerIcon } from '@usertour/icons';
import { useGetProjectSsoLoginQuery } from '@usertour/hooks';
import { AuthCard } from './components/auth-card';
import { SsoProviderButtons } from './components/sso-provider-buttons';

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
        <SsoProviderButtons providers={providers} />
      )}
    </AuthCard>
  );
};

SsoLogin.displayName = 'SsoLogin';

export { SsoLogin };
