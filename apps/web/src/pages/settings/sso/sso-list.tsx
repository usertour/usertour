import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  Input,
  Label,
  NewItemButton,
  ResourceListBody,
  type ResourceTableColumn,
  Separator,
  SettingsCard,
  SettingsCardStack,
} from '@usertour/ui';
import { RiFileCopyLine } from '@usertour/icons';
import { useAppContext } from '@/contexts/app-context';
import {
  type SsoProvider,
  useGetProjectConfigQuery,
  useGetProjectSsoSettingsQuery,
  useListProjectSsoProvidersQuery,
} from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';
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
  const copy = useCopyWithToast();
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
  // Per-project entry: a frontend route on this origin that lists the project's
  // providers as buttons. The one link an admin distributes to the whole team.
  const loginUrl = projectId ? `${window.location.origin}/auth/sso/${projectId}` : '';

  return (
    <SettingsCardStack>
      {/* Providers */}
      <SettingsCard>
        <div className="space-y-6">
          {/* Title + description grouped tightly, then the separator. */}
          <div className="space-y-2">
            <div className="flex h-10 flex-row items-center justify-between gap-4">
              <h3 className="text-xl font-medium tracking-tight">{t('settings.sso.title')}</h3>
              <NewSsoProviderButton onSuccess={refetch} />
            </div>
            <p className="text-sm text-muted-foreground">{t('settings.sso.headerBody')}</p>
          </div>
          <Separator />
          <ResourceListBody<SsoProvider>
            columns={columns}
            rows={providers}
            loading={loading || configLoading || !project}
            empty={t('settings.sso.empty')}
            getRowKey={(provider) => provider.id}
          />
          {projectId && (
            <div className="space-y-1.5">
              <Label>{t('settings.sso.loginUrlLabel')}</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={loginUrl}
                  onFocus={(event) => event.target.select()}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => copy(loginUrl, t('settings.sso.loginUrlCopied'))}
                >
                  <RiFileCopyLine className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{t('settings.sso.loginUrlHelp')}</p>
            </div>
          )}
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
