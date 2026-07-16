import { useTranslation } from 'react-i18next';
import type { IdentityVerificationStats } from '@usertour/hooks';

export interface IdentityVerificationCoverageCardProps {
  stats: IdentityVerificationStats[] | undefined;
  loading: boolean;
}

interface CoverageRowProps {
  label: string;
  stats: IdentityVerificationStats | undefined;
  anonymousNote?: string;
}

const CoverageRow = (props: CoverageRowProps) => {
  const { label, stats, anonymousNote } = props;
  const { t } = useTranslation();

  const valid = stats?.valid ?? 0;
  const invalid = stats?.invalid ?? 0;
  const missing = stats?.missing ?? 0;
  const total = valid + invalid + missing;
  const coverage = total > 0 ? Math.floor((valid / total) * 100) : null;

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {total > 0 ? (
          <div className="mt-0.5 text-sm text-muted-foreground">
            {t('settings.identityVerification.coverage.breakdown', {
              valid,
              invalid,
              missing,
            })}
            {anonymousNote ? ` · ${anonymousNote}` : ''}
          </div>
        ) : (
          <div className="mt-0.5 text-sm text-muted-foreground">
            {t('settings.identityVerification.coverage.noTraffic')}
            {anonymousNote ? ` · ${anonymousNote}` : ''}
          </div>
        )}
      </div>
      <div className="shrink-0 text-xl font-medium tabular-nums">
        {coverage !== null ? `${coverage}%` : '—'}
      </div>
    </div>
  );
};

export const IdentityVerificationCoverageCard = (props: IdentityVerificationCoverageCardProps) => {
  const { stats, loading } = props;
  const { t } = useTranslation();

  const userStats = stats?.find((entry) => entry.subject === 'user');
  const companyStats = stats?.find((entry) => entry.subject === 'company');
  const anonymousCount = userStats?.anonymous ?? 0;

  return (
    <div className="space-y-2">
      <h3 className="text-xl font-medium tracking-tight">
        {t('settings.identityVerification.coverage.title')}
      </h3>
      <p className="text-sm text-muted-foreground">
        {t('settings.identityVerification.coverage.description')}
      </p>
      {!loading && (
        <div className="divide-y">
          <CoverageRow
            label={t('settings.identityVerification.coverage.users')}
            stats={userStats}
            anonymousNote={
              anonymousCount > 0
                ? t('settings.identityVerification.coverage.anonymousNote', {
                    count: anonymousCount,
                  })
                : undefined
            }
          />
          <CoverageRow
            label={t('settings.identityVerification.coverage.companies')}
            stats={companyStats}
          />
        </div>
      )}
    </div>
  );
};

IdentityVerificationCoverageCard.displayName = 'IdentityVerificationCoverageCard';
