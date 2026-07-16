import { useTranslation } from 'react-i18next';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { Separator, SettingsCard, SettingsCardStack } from '@usertour/ui';
import { useGetIdentityVerificationStatsQuery, useListSigningSecretsQuery } from '@usertour/hooks';
import { useAppContext } from '@/contexts/app-context';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { SigningSecretCard } from './components/signing-secret-card';
import { IdentityVerificationEnforcementCard } from './components/identity-verification-enforcement-card';
import { IdentityVerificationCoverageCard } from './components/identity-verification-coverage-card';
import { IdentityTokenValidatorCard } from './components/identity-token-validator-card';

export const SettingsIdentityVerification = () => {
  const { environment } = useAppContext();
  const { t } = useTranslation();
  const environmentId = environment?.id;

  const {
    signingSecrets,
    loading,
    error: secretsError,
  } = useListSigningSecretsQuery(environmentId, SHARED_CACHE_QUERY_OPTIONS);
  const { stats, loading: statsLoading } = useGetIdentityVerificationStatsQuery(
    environmentId,
    SHARED_CACHE_QUERY_OPTIONS,
  );

  const activeSecrets = signingSecrets ?? [];
  // SHARED_CACHE convention: cache-and-network refetches flip `loading` while
  // data is still present; a bare !loading gate would unmount the stateful
  // SigningSecretCard mid-create and destroy the one-time reveal dialog.
  const secretsInitialLoading = loading && !signingSecrets;

  return (
    <SettingsCardStack>
      {/* Signing secret */}
      <SettingsCard>
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-medium tracking-tight">
              {t('settings.identityVerification.title', {
                environment: environment?.name ?? '',
              })}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('settings.identityVerification.headerBody')}
              <br />
              <a
                href="https://docs.usertour.io/developers/identity-verification"
                className="text-primary"
                target="_blank"
                rel="noreferrer"
              >
                <span>{t('settings.identityVerification.headerDocs')}</span>
                <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
              </a>
            </p>
          </div>
          <Separator />
          {/* A failed list query must not render as the empty state — its
              Generate button would silently start a rotation (or hit the
              two-active cap) against secrets that do exist. */}
          {environmentId && secretsError && !signingSecrets ? (
            <p className="text-sm text-destructive">
              {t('settings.identityVerification.secrets.loadFailure')}
            </p>
          ) : (
            environmentId &&
            !secretsInitialLoading && (
              <SigningSecretCard environmentId={environmentId} signingSecrets={activeSecrets} />
            )
          )}
        </div>
      </SettingsCard>

      {/* Token validator */}
      {environmentId && (
        <SettingsCard>
          <IdentityTokenValidatorCard environmentId={environmentId} />
        </SettingsCard>
      )}

      {/* Coverage */}
      <SettingsCard>
        <IdentityVerificationCoverageCard
          stats={stats}
          loading={(statsLoading && !stats) || !environment}
        />
      </SettingsCard>

      {/* Enforcement. Hidden while the secrets list failed with no cached
          data — hasActiveSecret would be a lie and the "generate a secret
          first" disabled state would contradict the error message above. */}
      {environmentId && !(secretsError && !signingSecrets) && (
        <SettingsCard>
          <IdentityVerificationEnforcementCard
            environmentId={environmentId}
            requireIdentityVerification={!!environment?.requireIdentityVerification}
            hasActiveSecret={activeSecrets.length > 0}
          />
        </SettingsCard>
      )}
    </SettingsCardStack>
  );
};

SettingsIdentityVerification.displayName = 'SettingsIdentityVerification';
