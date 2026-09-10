import { INTEGRATION_CATALOG } from '@usertour/constants';
import { getErrorMessage } from '@usertour/helpers';
import { useGetUserEnvironmentsQuery, useStartIntegrationOAuthMutation } from '@usertour/hooks';
import { Capability, type Project } from '@usertour/types';
import { Button, ComboboxSelect, LoadingButton, useToast } from '@usertour/ui';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useUserProjects } from '@/hooks/use-active-project';
import { AuthCard } from '@/pages/authentication/components/auth-card';

type MemberProject = Project & { capabilities?: Capability[] };

const canManageIntegrations = (project: MemberProject) =>
  (project.capabilities ?? []).includes(Capability.IntegrationManage);

/**
 * Install page for a provider-initiated OAuth install (ADR 0013 §2): the
 * provider's marketplace "Install" sends the browser to our callback, which
 * lands here with the provider's `returnUrl`. Signed in (the route is
 * user-guarded, so an unauthenticated arrival round-trips through sign-in),
 * the user picks the environment the provider account will sync with; the
 * start mutation then hands the state back to the provider on its returnUrl,
 * where the consent screen follows. A callback that could not complete an
 * install lands here too, with `error`.
 */
export const IntegrationInstall = () => {
  const { t } = useTranslation();
  const { provider = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const entry = INTEGRATION_CATALOG.find(
    (candidate) => candidate.provider === provider && candidate.hasObjectSync,
  );
  const name = entry?.name ?? provider;
  const returnUrl = params.get('returnUrl') ?? '';
  const failed = params.get('error') !== null;

  const projects = useUserProjects() as MemberProject[];
  const manageable = useMemo(() => projects.filter(canManageIntegrations), [projects]);
  const [projectId, setProjectId] = useState('');
  useEffect(() => {
    if (!projectId && manageable.length > 0) {
      setProjectId(
        manageable.find((candidate) => candidate.actived)?.id ?? manageable[0]?.id ?? '',
      );
    }
  }, [manageable, projectId]);
  const selectedProject = manageable.find((candidate) => candidate.id === projectId);

  const { environmentList, loading: environmentsLoading } = useGetUserEnvironmentsQuery(
    projectId || undefined,
  );
  // A member restricted to some environments may only connect one of those.
  const environments = useMemo(() => {
    const allowed =
      selectedProject?.role === 'OWNER' ? null : (selectedProject?.allowedEnvironmentIds ?? null);
    return (environmentList ?? []).filter(
      (environment) => allowed === null || allowed.includes(environment.id),
    );
  }, [environmentList, selectedProject]);
  const [environmentId, setEnvironmentId] = useState('');
  useEffect(() => {
    setEnvironmentId(
      environments.find((environment) => environment.isPrimary)?.id ?? environments[0]?.id ?? '',
    );
  }, [environments]);

  const { invoke: startOAuth, loading: starting } = useStartIntegrationOAuthMutation();

  if (!entry || (!returnUrl && !failed)) {
    return (
      <AuthCard
        title={t('oauth.install.errorTitle')}
        description={t('oauth.install.invalid', { name })}
        footer={
          <Button className="w-full" onClick={() => navigate('/')}>
            {t('oauth.install.openUsertour')}
          </Button>
        }
      />
    );
  }
  if (failed) {
    return (
      <AuthCard
        title={t('oauth.install.errorTitle')}
        description={t('oauth.install.failed', { name })}
        footer={
          <Button className="w-full" onClick={() => navigate('/')}>
            {t('oauth.install.openUsertour')}
          </Button>
        }
      />
    );
  }

  const handleContinue = async () => {
    try {
      const url = await startOAuth({ environmentId, provider, returnUrl });
      if (url) {
        window.location.assign(url);
        return;
      }
      toast({
        variant: 'destructive',
        title: t('settings.integrations.sync.failedToast', { name }),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const blocker =
    projects.length === 0
      ? t('oauth.install.noProjects', { name })
      : manageable.length === 0
        ? t('oauth.install.notAllowed', { name })
        : !environmentsLoading && projectId && environments.length === 0
          ? t('oauth.install.noEnvironments')
          : null;

  return (
    <AuthCard
      title={t('oauth.install.title', { name })}
      description={t('oauth.install.subtitle', { name })}
      footer={
        <LoadingButton
          className="w-full"
          loading={starting}
          disabled={!!blocker || !environmentId}
          onClick={handleContinue}
        >
          {t('oauth.install.continue', { name })}
        </LoadingButton>
      }
    >
      {blocker ? (
        <p className="text-sm text-muted-foreground">{blocker}</p>
      ) : (
        <>
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {t('oauth.install.projectLabel')}
            </span>
            {manageable.length === 1 ? (
              <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-foreground">
                {manageable[0].name}
              </div>
            ) : (
              <ComboboxSelect
                className="w-full"
                options={manageable.map((candidate) => ({
                  value: candidate.id ?? '',
                  label: candidate.name ?? '',
                }))}
                value={projectId}
                onValueChange={setProjectId}
                placeholder={t('oauth.install.projectLabel')}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {t('oauth.install.environmentLabel')}
            </span>
            <ComboboxSelect
              className="w-full"
              options={environments.map((environment) => ({
                value: environment.id,
                label: environment.name,
              }))}
              value={environmentId}
              onValueChange={setEnvironmentId}
              placeholder={t('oauth.install.environmentPlaceholder')}
            />
          </div>
        </>
      )}
    </AuthCard>
  );
};

IntegrationInstall.displayName = 'IntegrationInstall';
