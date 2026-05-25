import { Button } from '@usertour/button';
import { useCallback, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  useGetIntegrationQuery,
  useGetSalesforceAuthUrlQuery,
  useDisconnectIntegrationMutation,
  useGetIntegrationObjectMappingsQuery,
} from '@usertour/hooks';
import { useToast } from '@usertour/use-toast';
import { useAppContext } from '@/contexts/app-context';
import { integrations } from '@/utils/integration';
import { Card } from '@usertour/card';
import { CardHeader, CardTitle } from '@usertour/card';
import { CardContent } from '@usertour/card';
import { DotsVerticalIcon } from '@radix-ui/react-icons';
import { Skeleton } from '@usertour/skeleton';
import { ConnectIcon, DisconnectIcon, SpinnerIcon, PlusIcon } from '@usertour/icons';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour/dropdown-menu';
import { DropdownMenu } from '@usertour/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { IntegrationObjectMappingModel } from '@usertour/types';
import { ObjectMappingReadonly } from './object-mapping/object-mapping-readonly';
import { ObjectMappingDialog } from './object-mapping/object-mapping-dialog';

const INTEGRATION_PROVIDER = 'salesforce' as const;

export const SalesforceIntegration = () => {
  const { environment } = useAppContext();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const environmentId = environment?.id || '';

  const { data: currentIntegration, loading: isDataLoading } = useGetIntegrationQuery(
    environment?.id || '',
    INTEGRATION_PROVIDER,
    {
      skip: !environment?.id,
    },
  );

  // Query existing object mappings
  const {
    data: existingMappings,
    loading: isMappingsLoading,
    refetch: refetchMappings,
  } = useGetIntegrationObjectMappingsQuery(currentIntegration?.id || '', {
    skip: !currentIntegration?.id,
  });

  const { invoke: disconnectIntegration } = useDisconnectIntegrationMutation();

  const integrationInfo = integrations.find((i) => i.provider === INTEGRATION_PROVIDER);

  const { data: authUrl, loading: loadingAuthUrl } = useGetSalesforceAuthUrlQuery(
    environment?.id || '',
    INTEGRATION_PROVIDER,
    {
      skip: !environment?.id,
    },
  );

  const handleConnect = useCallback(async () => {
    if (!authUrl) {
      toast({
        title: t('settings.integrations.salesforce.authUrlFailedToast'),
        variant: 'destructive',
      });
      return;
    }

    window.location.href = authUrl;
  }, [authUrl, toast, t]);

  const handleDisconnect = useCallback(async () => {
    try {
      setIsDisconnecting(true);
      await disconnectIntegration(environmentId, INTEGRATION_PROVIDER);
      toast({
        variant: 'success',
        title: t('settings.integrations.salesforce.disconnectSuccessToast'),
      });
      navigate('/project/1/settings/integrations');
    } catch {
      toast({
        title: t('settings.integrations.salesforce.disconnectFailureToast'),
        variant: 'destructive',
      });
    } finally {
      setIsDisconnecting(false);
    }
  }, [environmentId, disconnectIntegration, toast, navigate, t]);

  if (isDataLoading || isMappingsLoading) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="space-between flex items-center gap-4 flex-row items-center">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex items-center gap-4 flex-row items-center relative">
            <img
              src={integrationInfo?.imagePath}
              alt={`${integrationInfo?.name} logo`}
              className="w-12 h-12"
            />
            <div className="flex flex-col gap-1">
              <span className="text-lg font-semibold">
                {t('settings.integrations.salesforce.connectionTitle', {
                  name: integrationInfo?.name ?? '',
                })}
              </span>
              <div className="text-sm text-muted-foreground font-normal">
                <Trans
                  i18nKey="settings.integrations.salesforce.connectedAs"
                  values={{
                    email: currentIntegration?.integrationOAuth?.data?.email ?? '',
                    organization:
                      currentIntegration?.integrationOAuth?.data?.organizationName ?? '',
                  }}
                  components={{ strong: <span className="font-bold text-foreground" /> }}
                />
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 absolute right-0 top-0"
                  disabled={loadingAuthUrl || isDisconnecting}
                >
                  <DotsVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem className="cursor-pointer" onClick={handleConnect}>
                  <ConnectIcon className="mr-1 w-4 h-4" />
                  {t('settings.integrations.salesforce.reconnect')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? (
                    <SpinnerIcon className="mr-1 w-4 h-4 animate-spin" />
                  ) : (
                    <DisconnectIcon className="mr-1 w-4 h-4" />
                  )}
                  {t('settings.integrations.salesforce.disconnect')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Existing Object Mappings */}
      {existingMappings && existingMappings.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {t('settings.integrations.salesforce.existingMappingsTitle')}
          </h3>
          {existingMappings.map((mapping: IntegrationObjectMappingModel) => (
            <ObjectMappingReadonly
              key={mapping.id}
              mapping={mapping}
              onDelete={() => refetchMappings()}
              onUpdate={refetchMappings}
            />
          ))}
        </div>
      )}

      {/* Create new mapping */}
      <Card
        className="border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors cursor-pointer"
        onClick={() => setIsCreateDialogOpen(true)}
      >
        <CardContent className="flex items-center justify-center p-6">
          <div className="flex items-center gap-2">
            <PlusIcon className="h-6 w-6" />
            <span className="text-sm text-muted-foreground">
              {t('settings.integrations.salesforce.newMappingCta')}
            </span>
          </div>
        </CardContent>
      </Card>

      <ObjectMappingDialog
        integrationId={currentIntegration?.id || ''}
        onSuccess={refetchMappings}
        mode="create"
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </>
  );
};

SalesforceIntegration.displayName = 'SalesforceIntegration';
