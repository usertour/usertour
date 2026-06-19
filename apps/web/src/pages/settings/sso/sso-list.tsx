import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, NewItemButton, ResourceListPage, type ResourceTableColumn } from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';
import {
  type SsoProvider,
  useGetProjectConfigQuery,
  useListProjectSsoProvidersQuery,
} from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { SsoProviderDialog } from './components/sso-provider-dialog';
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

  // Plan gate — the server enforces this independently; mirror it in the UI.
  if (projectConfig && !projectConfig.ssoOidc) {
    return <SsoUpsell isSelfHosted={!!globalConfig?.isSelfHostedMode} projectId={project?.id} />;
  }

  const loginUrl = project ? `${window.location.origin}/auth/sso/${project.id}` : '';

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

  return (
    <ResourceListPage<SsoProvider>
      title={t('settings.sso.title')}
      actions={<NewSsoProviderButton onSuccess={refetch} />}
      description={
        <>
          {t('settings.sso.headerBody')}
          <br />
          {t('settings.sso.loginUrlLabel')} <code className="text-foreground">{loginUrl}</code>
        </>
      }
      columns={columns}
      rows={providers}
      loading={loading || configLoading || !project}
      empty={t('settings.sso.empty')}
      getRowKey={(provider) => provider.id}
    />
  );
};

SettingsSsoList.displayName = 'SettingsSsoList';
