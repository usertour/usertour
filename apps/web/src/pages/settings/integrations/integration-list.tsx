import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGetProjectConfigQuery, useListIntegrationsQuery } from '@usertour/hooks';
import { Button, SettingsPage, Skeleton } from '@usertour/ui';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';
import { useCooldownTick } from '../components/use-cooldown-tick';
import { INTEGRATION_CATALOG } from '@usertour/constants';
import { IntegrationStatusBadge } from './components/integration-status-badge';
import { IntegrationUpsell } from './components/integration-upsell';

const INTEGRATIONS_DOCS_HREF = 'https://docs.usertour.io/integrations/overview';

export const SettingsIntegrationList = () => {
  const { environment, project } = useAppContext();
  const { projectConfig } = useGetProjectConfigQuery(project?.id, SHARED_CACHE_QUERY_OPTIONS);
  const { integrations, loading } = useListIntegrationsQuery(
    environment?.id ?? '',
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Drop the "Cooling down" badge on schedule, not on the next refetch.
  useCooldownTick((integrations ?? []).map((integration) => integration.cooldownUntil));

  // Plan gate — the server enforces this independently; mirror it in the UI.
  // Same settle discipline as the webhook list: optimistic while EITHER query
  // is still resolving, so a transiently-actived wrong project (hard refresh)
  // or a cached projectConfig ahead of this page's own list can't flash the
  // assertive downgraded/upsell state.
  const entitled = !projectConfig || projectConfig.integrations;
  const settled = !!environment && !!integrations && !!projectConfig;
  const entitledView = settled ? entitled : true;
  if (!entitledView && integrations?.length === 0) {
    return <IntegrationUpsell projectId={project?.id} environmentName={environment?.name ?? ''} />;
  }
  // While settling, show skeleton cards instead of the real catalog: an
  // un-entitled project would otherwise flash the full five-card catalog and
  // then flip to the upsell — a content reversal, where skeleton-to-outcome
  // reads as loading. Entitled projects fill the same layout in place.
  if (!settled) {
    return (
      <SettingsPage
        title={t('settings.integrations.title', { environment: environment?.name ?? '' })}
        description={t('settings.integrations.headerBody')}
        docs={{
          href: INTEGRATIONS_DOCS_HREF,
          label: t('settings.common.readGuide', { topic: t('settings.nav.sections.integrations') }),
        }}
      >
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {INTEGRATION_CATALOG.map((entry) => (
            <li
              key={entry.provider}
              className="rounded-xl border bg-card px-4 py-6 dark:bg-surface-raised"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
              <Skeleton className="mt-3 h-4 w-24" />
              <Skeleton className="mt-2 h-4 w-48" />
            </li>
          ))}
        </ul>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage
      title={t('settings.integrations.title', { environment: environment?.name ?? '' })}
      description={
        entitledView ? (
          t('settings.integrations.headerBody')
        ) : (
          <span className="text-amber-600">{t('settings.integrations.downgraded.banner')}</span>
        )
      }
      docs={{
        href: INTEGRATIONS_DOCS_HREF,
        label: t('settings.common.readGuide', { topic: t('settings.nav.sections.integrations') }),
      }}
    >
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {INTEGRATION_CATALOG.map((entry) => {
          const integration = integrations?.find((row) => row.provider === entry.provider);
          // Link-out providers have no row and no connection state on this side.
          const automation = entry.kind === 'automation';
          return (
            <li
              key={entry.provider}
              // Bordered card by explicit decision for this catalog grid —
              // shadows read too faint on the white page; dark additionally
              // lifts on raised-surface lightness.
              className="rounded-xl border bg-card px-4 py-6 text-sm dark:bg-surface-raised"
            >
              <div className="flex items-center justify-between">
                <img
                  className="h-8 w-8 rounded-lg border border-accent-light object-cover"
                  src={entry.imagePath}
                  alt={t('settings.integrations.catalog.logoAlt', { name: entry.name })}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={loading && !integrations}
                  onClick={() => navigate(`${location.pathname}/${entry.provider}`)}
                >
                  {automation
                    ? t('settings.integrations.catalog.setUp')
                    : integration
                      ? t('settings.integrations.catalog.manage')
                      : t('settings.integrations.catalog.connect')}
                </Button>
              </div>
              <div className="mt-2 flex items-center gap-2 font-medium">
                <span>{entry.name}</span>
                {integration && <IntegrationStatusBadge integration={integration} />}
              </div>
              <div className="mt-1 text-muted-foreground">
                {t(`settings.integrations.catalog.descriptions.${entry.provider}`)}
              </div>
            </li>
          );
        })}
      </ul>
    </SettingsPage>
  );
};

SettingsIntegrationList.displayName = 'SettingsIntegrationList';
