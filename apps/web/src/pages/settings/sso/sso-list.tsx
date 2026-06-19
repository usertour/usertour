import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  NewItemButton,
  ResourceListBody,
  type ResourceTableColumn,
  Separator,
  SettingsCard,
  SettingsCardStack,
} from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';
import {
  type SsoProvider,
  useGetProjectConfigQuery,
  useGetProjectSsoSettingsQuery,
  useListProjectSsoProvidersQuery,
} from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { SsoEnforcementCard } from './components/sso-enforcement-card';
import { SsoProviderDialog } from './components/sso-provider-dialog';
import { SsoProvisioningCard } from './components/sso-provisioning-card';
import { SsoRowActions } from './components/sso-row-actions';
import { SsoUpsell } from './components/sso-upsell';

const NewSsoProviderButton = ({ onSuccess }: { onSuccess: () => void }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <NewItemButton onClick={() => setOpen(true)} label={t('settings.sso.newButton')} />
      <SsoProviderDialog open={open} onOpenChange={setOpen} onSubmit={onSuccess} />
    </>
  );
};

export const SettingsSsoList = () => {
  const { project, globalConfig } = useAppContext();
  const { t } = useTranslation();
  const { projectConfig, loading: configLoading } = useGetProjectConfigQuery(
    project?.id,
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const { providers, loading, refetch } = useListProjectSsoProvidersQuery(
    project?.id,
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const { settings, refetch: refetchSettings } = useGetProjectSsoSettingsQuery(
    project?.id,
    SHARED_CACHE_QUERY_OPTIONS,
  );

  // Plan gate — the server enforces this independently; mirror it in the UI.
  if (projectConfig && !projectConfig.ssoOidc) {
    return <SsoUpsell isSelfHosted={!!globalConfig?.isSelfHostedMode} projectId={project?.id} />;
  }

  const columns: ResourceTableColumn<SsoProvider>[] = [
    {
      header: t('settings.sso.columns.name'),
      className: 'truncate',
      cell: (provider) => provider.name,
    },
    {
      header: t('settings.sso.columns.issuer'),
      className: 'truncate hidden lg:table-cell',
      headerClassName: 'hidden lg:table-cell',
      cell: (provider) => provider.issuer,
    },
    {
      header: t('settings.sso.columns.status'),
      headerClassName: 'w-28',
      cell: (provider) => (
        <Badge variant={provider.status === 'active' ? 'success' : 'secondary'}>
          {provider.status === 'active'
            ? t('settings.sso.status.active')
            : t('settings.sso.status.inactive')}
        </Badge>
      ),
    },
    {
      header: '',
      headerClassName: 'w-20',
      cell: (provider) => <SsoRowActions provider={provider} onChanged={refetch} />,
    },
  ];

  const hasActiveProvider = providers.some((provider) => provider.status === 'active');
  const projectId = project?.id;

  return (
    <SettingsCardStack>
      {/* Providers */}
      <SettingsCard>
        <div className="space-y-6">
          <div className="flex h-10 flex-row items-center justify-between gap-4">
            <h3 className="text-xl font-medium tracking-tight">{t('settings.sso.title')}</h3>
            <NewSsoProviderButton onSuccess={refetch} />
          </div>
          <p className="text-sm text-muted-foreground">{t('settings.sso.headerBody')}</p>
          <Separator />
          <ResourceListBody<SsoProvider>
            columns={columns}
            rows={providers}
            loading={loading || configLoading || !project}
            empty={t('settings.sso.empty')}
            getRowKey={(provider) => provider.id}
          />
        </div>
      </SettingsCard>

      {/* Enforcement */}
      {projectId && settings && (
        <SettingsCard>
          <SsoEnforcementCard
            projectId={projectId}
            requireSso={settings.requireSso}
            hasActiveProvider={hasActiveProvider}
            onChanged={refetchSettings}
          />
        </SettingsCard>
      )}

      {/* Provisioning */}
      {projectId && settings && (
        <SettingsCard>
          <SsoProvisioningCard
            projectId={projectId}
            settings={settings}
            onChanged={refetchSettings}
          />
        </SettingsCard>
      )}
    </SettingsCardStack>
  );
};

SettingsSsoList.displayName = 'SettingsSsoList';
