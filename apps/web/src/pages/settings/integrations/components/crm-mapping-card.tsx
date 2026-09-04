import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { getErrorMessage } from '@usertour/helpers';
import {
  type Integration,
  useDeleteIntegrationObjectMappingMutation,
  useListAttributesQuery,
  useListCrmRemotePropertiesQuery,
  useListIntegrationObjectMappingsQuery,
  useRunIntegrationObjectMappingSyncMutation,
} from '@usertour/hooks';
import { RiDeleteBinLine, RiMore2Line, RiPencilLine, RiRefreshLine } from '@usertour/icons';
import {
  Badge,
  Button,
  DestructiveConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from '@usertour/ui';
import { type IntegrationCatalogEntry, crmRemotePropertyNameFor } from '@usertour/constants';
import { AttributeBizTypes, type CrmLocalObject, type CrmRemoteObject } from '@usertour/types';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';
import { CrmMappingDialog } from './crm-mapping-dialog';
import {
  CrmFieldChip,
  CrmObjectPairTitle,
  CrmPairRow,
  crmObjectLabelKeys,
} from './crm-mapping-parts';

export interface CrmMappingCardProps {
  entry: IntegrationCatalogEntry;
  integration: Integration;
  remoteObject: CrmRemoteObject;
  localObject: CrmLocalObject;
  entitled: boolean;
}

/**
 * One object pair on the provider page: the saved mapping laid out read-only
 * (match rule, fields in, fields out, sync status) with Edit / Sync now /
 * Remove, or a set-up prompt while there is none. Editing happens in
 * CrmMappingDialog so a half-finished change never sits on the page.
 */
export const CrmMappingCard = (props: CrmMappingCardProps) => {
  const { entry, integration, remoteObject, localObject, entitled } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isViewOnly, project } = useAppContext();
  const name = entry.name;
  const canWrite = !isViewOnly && entitled;
  const labels = crmObjectLabelKeys(remoteObject, localObject);

  const { mappings } = useListIntegrationObjectMappingsQuery(
    integration.id,
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const mapping = mappings?.find(
    (row) => row.remoteObject === remoteObject && row.localObject === localObject,
  );
  const { properties, error: propertiesError } = useListCrmRemotePropertiesQuery(
    integration.id,
    remoteObject,
  );
  const bizType = localObject === 'user' ? AttributeBizTypes.User : AttributeBizTypes.Company;
  const { attributes } = useListAttributesQuery(project?.id ?? '', bizType, {
    ...SHARED_CACHE_QUERY_OPTIONS,
    skip: !project?.id,
  });
  const { invoke: removeMapping, loading: removing } = useDeleteIntegrationObjectMappingMutation();
  const { invoke: runSync, loading: syncStarting } = useRunIntegrationObjectMappingSyncMutation();
  const syncInProgress = !!mapping?.fullSyncStartedAt;

  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const propertyLabel = (propertyName: string) =>
    properties?.find((property) => property.name === propertyName)?.label ?? propertyName;
  const attributeLabel = (codeName: string) =>
    attributes?.find((attribute) => attribute.codeName === codeName)?.displayName ?? codeName;
  const localMatchLabel = mapping
    ? mapping.matchStrategy === 'email'
      ? t('settings.integrations.crm.mapping.matchLocalEmail')
      : localObject === 'user'
        ? t('settings.integrations.crm.mapping.matchLocalUserId')
        : t('settings.integrations.crm.mapping.matchLocalCompanyId')
    : '';
  const remoteMatchField = mapping
    ? (mapping.matchRemoteField ?? (mapping.matchStrategy === 'email' ? 'email' : ''))
    : '';

  const handleSyncNow = async () => {
    if (!mapping) {
      return;
    }
    try {
      const started = await runSync({ integrationId: integration.id, id: mapping.id });
      toast({
        variant: started ? 'success' : 'destructive',
        title: started
          ? t('settings.integrations.crm.mapping.syncQueued')
          : t('settings.integrations.crm.mapping.syncFailed'),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const handleRemove = async () => {
    if (!mapping) {
      return;
    }
    try {
      const removed = await removeMapping({ integrationId: integration.id, id: mapping.id });
      if (removed) {
        setRemoveOpen(false);
        toast({ variant: 'success', title: t('settings.integrations.crm.mapping.removed') });
      } else {
        toast({
          variant: 'destructive',
          title: t('settings.integrations.crm.mapping.removeFailed'),
        });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <CrmObjectPairTitle
            provider={entry.provider}
            providerName={name}
            remoteLabel={t(labels.remote)}
            localLabel={t(labels.local)}
          />
          {syncInProgress && (
            <Badge variant="secondary">
              {t('settings.integrations.crm.mapping.syncInProgress')}
            </Badge>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {mapping ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('settings.integrations.crm.mapping.moreActions')}
                  >
                    <RiMore2Line className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled={!canWrite} onSelect={() => setEditOpen(true)}>
                    <RiPencilLine className="mr-2 h-4 w-4" />
                    {t('settings.integrations.crm.mapping.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canWrite || syncInProgress || syncStarting}
                    onSelect={() => void handleSyncNow()}
                  >
                    <RiRefreshLine className="mr-2 h-4 w-4" />
                    {t('settings.integrations.crm.mapping.syncNow')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={!canWrite || removing}
                    onSelect={() => setRemoveOpen(true)}
                  >
                    <RiDeleteBinLine className="mr-2 h-4 w-4" />
                    {t('settings.integrations.crm.mapping.remove')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button type="button" disabled={!canWrite} onClick={() => setEditOpen(true)}>
              {t('settings.integrations.crm.mapping.setUp')}
            </Button>
          )}
        </div>
      </div>

      {propertiesError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {t('settings.integrations.crm.mapping.propertiesLoadFailed', { name })}
        </div>
      )}

      {!mapping ? (
        <p className="text-sm text-muted-foreground">
          {t('settings.integrations.crm.mapping.description', { name })}
        </p>
      ) : (
        <>
          <section className="space-y-2">
            <p className="text-sm font-medium">
              {t('settings.integrations.crm.mapping.matchLabel')}
            </p>
            <CrmPairRow
              connector="equals"
              left={
                <CrmFieldChip
                  side="remote"
                  provider={entry.provider}
                  label={propertyLabel(remoteMatchField)}
                  hint={remoteMatchField}
                />
              }
              right={
                <CrmFieldChip side="local" provider={entry.provider} label={localMatchLabel} />
              }
            />
          </section>

          <section className="space-y-2 rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium">
              {t('settings.integrations.crm.mapping.inboundSyncing', { name })}
            </p>
            {mapping.inboundFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('settings.integrations.crm.mapping.emptyInbound', { name })}
              </p>
            ) : (
              <div className="space-y-2">
                {mapping.inboundFields.map((field) => (
                  <CrmPairRow
                    key={field.remote}
                    connector="arrow"
                    left={
                      <CrmFieldChip
                        side="remote"
                        provider={entry.provider}
                        label={propertyLabel(field.remote)}
                        hint={field.remote}
                      />
                    }
                    right={
                      <CrmFieldChip
                        side="local"
                        provider={entry.provider}
                        label={attributeLabel(field.local)}
                        hint={field.local}
                      />
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2 rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium">
              {t('settings.integrations.crm.mapping.outboundSyncing', { name })}
            </p>
            {mapping.outboundFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('settings.integrations.crm.mapping.emptyOutbound', { name })}
              </p>
            ) : (
              <div className="space-y-2">
                {mapping.outboundFields.map((field) => {
                  const remoteName =
                    field.remote ?? crmRemotePropertyNameFor(localObject, field.local);
                  return (
                    <CrmPairRow
                      key={field.local}
                      connector="arrow"
                      left={
                        <CrmFieldChip
                          side="local"
                          provider={entry.provider}
                          label={attributeLabel(field.local)}
                          hint={field.local}
                        />
                      }
                      right={
                        <CrmFieldChip
                          side="remote"
                          provider={entry.provider}
                          label={propertyLabel(remoteName)}
                          hint={remoteName}
                        />
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>

          <p className="text-sm text-muted-foreground">
            {mapping.lastFullSyncAt
              ? t('settings.integrations.crm.mapping.lastSynced', {
                  time: format(new Date(mapping.lastFullSyncAt), 'PPp'),
                })
              : t('settings.integrations.crm.mapping.neverSynced')}
            {' · '}
            {t('settings.integrations.crm.mapping.stats', {
              matched: mapping.matchedCount,
              unresolved: mapping.unresolvedCount,
            })}
          </p>
        </>
      )}

      <CrmMappingDialog
        entry={entry}
        integration={integration}
        remoteObject={remoteObject}
        localObject={localObject}
        mapping={mapping}
        properties={properties ?? []}
        attributes={attributes ?? []}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DestructiveConfirmDialog
        title={t('settings.integrations.crm.mapping.removeConfirmTitle')}
        description={t('settings.integrations.crm.mapping.removeConfirmDescription', { name })}
        confirmLabel={t('settings.integrations.crm.mapping.remove')}
        cancelLabel={t('settings.common.cancel')}
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        onConfirm={handleRemove}
        loading={removing}
      />
    </div>
  );
};

CrmMappingCard.displayName = 'CrmMappingCard';
