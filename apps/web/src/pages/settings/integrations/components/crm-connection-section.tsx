import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { getErrorMessage } from '@usertour/helpers';
import {
  type Integration,
  useDisconnectCrmIntegrationMutation,
  useStartCrmOAuthMutation,
} from '@usertour/hooks';
import { RiLinkM, RiLinkUnlinkM, RiMore2Line } from '@usertour/icons';
import {
  Badge,
  Button,
  DestructiveConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  LoadingButton,
  useToast,
} from '@usertour/ui';
import type { IntegrationCatalogEntry } from '@usertour/constants';
import { useAppContext } from '@/contexts/app-context';
import { ExternalLink } from '@/components/external-link';

// Where a self-hosting operator learns to register the provider app.
const CRM_SETUP_DOCS_HREF: Partial<Record<IntegrationCatalogEntry['provider'], string>> = {
  hubspot: 'https://docs.usertour.io/integrations/hubspot',
};

export interface CrmConnectionSectionProps {
  entry: IntegrationCatalogEntry;
  integration: Integration | undefined;
  environmentId: string;
  entitled: boolean;
}

/** Query keys the OAuth callback appends when it lands the browser back here. */
const RETURN_PARAMS = ['connected', 'error', 'provider'] as const;

/**
 * Connection card for a CRM provider (ADR 0013 §2): the OAuth handshake is a
 * full-page round trip — Connect asks the server for the authorize URL and
 * navigates there; the server callback creates the row and redirects back
 * with `?connected=1` or `?error=...`, which this card turns into a toast.
 */
export const CrmConnectionSection = (props: CrmConnectionSectionProps) => {
  const { entry, integration, environmentId, entitled } = props;
  const { isViewOnly, globalConfig } = useAppContext();
  // Until the global config arrives assume configured, so the setup note
  // never flashes on cloud.
  const configured = globalConfig
    ? (globalConfig.configuredCrmProviders ?? []).includes(entry.provider)
    : true;
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const { invoke: startOAuth, loading: starting } = useStartCrmOAuthMutation();
  const { invoke: disconnect, loading: disconnecting } = useDisconnectCrmIntegrationMutation();
  const connected = !!integration?.connected;
  const canWrite = !isViewOnly && entitled;
  const name = entry.name;

  useEffect(() => {
    const returned = searchParams.get('connected');
    const error = searchParams.get('error');
    if (!returned && !error) {
      return;
    }
    if (returned) {
      toast({ variant: 'success', title: t('settings.integrations.crm.connectedToast', { name }) });
    } else {
      const key =
        error === 'denied' ? 'deniedToast' : error === 'license' ? 'licenseToast' : 'failedToast';
      toast({ variant: 'destructive', title: t(`settings.integrations.crm.${key}`, { name }) });
    }
    const next = new URLSearchParams(searchParams);
    for (const param of RETURN_PARAMS) {
      next.delete(param);
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, toast, t, name]);

  const handleConnect = async () => {
    try {
      const url = await startOAuth({ environmentId, provider: entry.provider });
      if (url) {
        window.location.assign(url);
      } else {
        toast({
          variant: 'destructive',
          title: t('settings.integrations.crm.failedToast', { name }),
        });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const handleDisconnect = async () => {
    if (!integration) {
      return;
    }
    try {
      const saved = await disconnect(integration.id);
      if (saved) {
        toast({
          variant: 'success',
          title: t('settings.integrations.crm.disconnectSuccess', { name }),
        });
        setDisconnectOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: t('settings.integrations.crm.disconnectFailure', { name }),
        });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            className="h-12 w-12 rounded-lg border border-accent-light object-cover"
            src={entry.imagePath}
            alt={t('settings.integrations.catalog.logoAlt', { name })}
          />
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-medium tracking-tight">{name}</h3>
            {connected ? (
              <Badge variant="success">{t('settings.integrations.crm.connected')}</Badge>
            ) : (
              <Badge variant="secondary">{t('settings.integrations.crm.notConnected')}</Badge>
            )}
          </div>
        </div>
        {connected && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('settings.integrations.crm.moreActions')}
              >
                <RiMore2Line className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!canWrite || starting}
                onSelect={() => void handleConnect()}
              >
                <RiLinkM className="mr-2 h-4 w-4" />
                {t('settings.integrations.crm.reconnect')}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                disabled={!canWrite || disconnecting}
                onSelect={() => setDisconnectOpen(true)}
              >
                <RiLinkUnlinkM className="mr-2 h-4 w-4" />
                {t('settings.integrations.crm.disconnect')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {connected ? (
            <>
              <p className="text-sm font-medium">{t('settings.integrations.crm.account')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {integration?.remoteAccountLabel ?? integration?.remoteAccountId}
                {integration?.remoteAccountLabel && integration?.remoteAccountId && (
                  <span className="ml-2 text-xs">#{integration.remoteAccountId}</span>
                )}
              </p>
            </>
          ) : configured ? (
            <p className="text-sm text-muted-foreground">
              {t('settings.integrations.crm.connectDescription', { name })}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('settings.integrations.crm.notConfigured', { name })}
              {CRM_SETUP_DOCS_HREF[entry.provider] && (
                <>
                  {' '}
                  <ExternalLink href={CRM_SETUP_DOCS_HREF[entry.provider] as string}>
                    {t('settings.integrations.crm.notConfiguredDocs')}
                  </ExternalLink>
                </>
              )}
            </p>
          )}
        </div>
        <div className="shrink-0">
          {connected ? null : configured ? (
            <LoadingButton
              type="button"
              loading={starting}
              disabled={!canWrite}
              onClick={() => void handleConnect()}
            >
              {t('settings.integrations.crm.connect', { name })}
            </LoadingButton>
          ) : null}
        </div>
      </div>

      {integration?.autoDisabledAt && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {t('settings.integrations.autoDisabled.banner', {
            time: format(new Date(integration.autoDisabledAt), 'PP'),
          })}
        </div>
      )}

      <DestructiveConfirmDialog
        title={t('settings.integrations.crm.disconnectConfirmTitle', { name })}
        description={t('settings.integrations.crm.disconnectConfirmDescription')}
        confirmLabel={t('settings.integrations.crm.disconnect')}
        cancelLabel={t('settings.common.cancel')}
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        onConfirm={handleDisconnect}
        loading={disconnecting}
      />
    </div>
  );
};

CrmConnectionSection.displayName = 'CrmConnectionSection';
