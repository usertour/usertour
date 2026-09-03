import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { getErrorMessage } from '@usertour/helpers';
import {
  type Integration,
  useDeleteIntegrationObjectMappingMutation,
  useListAttributesQuery,
  useListCrmRemotePropertiesQuery,
  useListIntegrationObjectMappingsQuery,
  useUpsertIntegrationObjectMappingMutation,
} from '@usertour/hooks';
import {
  Button,
  ComboboxSelect,
  DestructiveConfirmDialog,
  FacetedMultiSelect,
  LoadingButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  useToast,
} from '@usertour/ui';
import type { IntegrationCatalogEntry } from '@usertour/constants';
import {
  AttributeBizTypes,
  type CrmLocalObject,
  type CrmMatchStrategy,
  type CrmRemoteObject,
} from '@usertour/types';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';

export interface CrmMappingSectionProps {
  entry: IntegrationCatalogEntry;
  integration: Integration;
  remoteObject: CrmRemoteObject;
  localObject: CrmLocalObject;
  entitled: boolean;
}

/**
 * One object pair's mapping editor (ADR 0013 §4-6): match rule, the provider
 * properties synced in, and the Usertour attributes written back. Inbound
 * fields keep the provider property name as their attribute code name — the
 * provider already constrains those to identifier-safe lowercase names, so
 * no rename step is needed in this milestone.
 */
export const CrmMappingSection = (props: CrmMappingSectionProps) => {
  const { entry, integration, remoteObject, localObject, entitled } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isViewOnly, project } = useAppContext();
  const name = entry.name;
  const canWrite = !isViewOnly && entitled;

  const { mappings } = useListIntegrationObjectMappingsQuery(
    integration.id,
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const mapping = mappings?.find(
    (row) => row.remoteObject === remoteObject && row.localObject === localObject,
  );
  const {
    properties,
    loading: propertiesLoading,
    error: propertiesError,
  } = useListCrmRemotePropertiesQuery(integration.id, remoteObject);
  const bizType = localObject === 'user' ? AttributeBizTypes.User : AttributeBizTypes.Company;
  const { attributes } = useListAttributesQuery(project?.id ?? '', bizType, {
    ...SHARED_CACHE_QUERY_OPTIONS,
    skip: !project?.id,
  });
  const { invoke: saveMapping, loading: saving } = useUpsertIntegrationObjectMappingMutation();
  const { invoke: removeMapping, loading: removing } = useDeleteIntegrationObjectMappingMutation();

  // Companies have no email: the id-property rule is the only one.
  const fixedStrategy: CrmMatchStrategy | null = remoteObject === 'company' ? 'remoteField' : null;
  const [matchStrategy, setMatchStrategy] = useState<CrmMatchStrategy>(
    fixedStrategy ?? mapping?.matchStrategy ?? 'email',
  );
  const [matchRemoteField, setMatchRemoteField] = useState(mapping?.matchRemoteField ?? '');
  const [inbound, setInbound] = useState<string[]>(
    mapping?.inboundFields.map((field) => field.remote) ?? [],
  );
  const [outbound, setOutbound] = useState<string[]>(
    mapping?.outboundFields.map((field) => field.local) ?? [],
  );
  const [adoptOpen, setAdoptOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  // Re-seed the form from the server row whenever it changes underneath us.
  const mappingVersion = mapping ? `${mapping.id}:${mapping.updatedAt}` : '';
  useEffect(() => {
    setMatchStrategy(fixedStrategy ?? mapping?.matchStrategy ?? 'email');
    setMatchRemoteField(mapping?.matchRemoteField ?? '');
    setInbound(mapping?.inboundFields.map((field) => field.remote) ?? []);
    setOutbound(mapping?.outboundFields.map((field) => field.local) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappingVersion]);

  const propertyOptions = (properties ?? []).map((property) => ({
    value: property.name,
    label: property.readOnly
      ? `${property.label} ${t('settings.integrations.crm.mapping.readOnlySuffix')}`
      : property.label,
  }));
  const matchFieldOptions = (properties ?? [])
    .filter((property) => property.type === 'string' && !property.readOnly)
    .map((property) => ({ value: property.name, label: property.label, hint: property.name }));
  const inboundSet = new Set(inbound);
  // Write-back candidates: Usertour-owned attributes not already synced in.
  const attributeOptions = (attributes ?? [])
    .filter(
      (attribute) =>
        (attribute.source ?? 'internal') === 'internal' && !inboundSet.has(attribute.codeName),
    )
    .map((attribute) => ({ value: attribute.codeName, label: attribute.displayName }));

  const submit = async (adoptExisting: boolean) => {
    try {
      const saved = await saveMapping({
        integrationId: integration.id,
        remoteObject,
        localObject,
        matchStrategy,
        matchRemoteField: matchStrategy === 'remoteField' ? matchRemoteField : null,
        inboundFields: inbound.map((remote) => ({ remote, local: remote })),
        outboundFields: outbound.map((local) => ({ local })),
        enabled: true,
        adoptExisting,
      });
      if (saved) {
        setAdoptOpen(false);
        toast({ variant: 'success', title: t('settings.integrations.crm.mapping.saved') });
      } else {
        toast({ variant: 'destructive', title: t('settings.integrations.crm.mapping.saveFailed') });
      }
    } catch (error) {
      const message = getErrorMessage(error);
      // The server refuses to take over an existing attribute silently; ask.
      if (!adoptExisting && message.includes('already exists')) {
        setAdoptOpen(true);
        return;
      }
      toast({ variant: 'destructive', title: message });
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
      <div>
        <h3 className="text-xl font-medium tracking-tight">
          {remoteObject === 'contact'
            ? t('settings.integrations.crm.mapping.contactsTitle')
            : t('settings.integrations.crm.mapping.companiesTitle')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('settings.integrations.crm.mapping.description', { name })}
        </p>
        {mapping && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t('settings.integrations.crm.mapping.stats', {
              matched: mapping.matchedCount,
              unresolved: mapping.unresolvedCount,
            })}
            {' · '}
            {mapping.lastFullSyncAt
              ? t('settings.integrations.crm.mapping.lastSynced', {
                  time: format(new Date(mapping.lastFullSyncAt), 'PPp'),
                })
              : t('settings.integrations.crm.mapping.neverSynced')}
          </p>
        )}
      </div>

      {propertiesError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {t('settings.integrations.crm.mapping.propertiesLoadFailed', { name })}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">{t('settings.integrations.crm.mapping.matchLabel')}</p>
        {!fixedStrategy && (
          <Select
            value={matchStrategy}
            onValueChange={(value) => setMatchStrategy(value as CrmMatchStrategy)}
            disabled={!canWrite}
          >
            <SelectTrigger className="w-full max-w-md">
              {matchStrategy === 'email'
                ? t('settings.integrations.crm.mapping.matchEmail')
                : t('settings.integrations.crm.mapping.matchRemoteField', { name })}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">
                {t('settings.integrations.crm.mapping.matchEmail')}
              </SelectItem>
              <SelectItem value="remoteField">
                {t('settings.integrations.crm.mapping.matchRemoteField', { name })}
              </SelectItem>
            </SelectContent>
          </Select>
        )}
        {matchStrategy === 'remoteField' && (
          <>
            <ComboboxSelect
              value={matchRemoteField}
              onValueChange={setMatchRemoteField}
              options={matchFieldOptions}
              placeholder={t('settings.integrations.crm.mapping.matchFieldPlaceholder')}
              searchPlaceholder={t('settings.integrations.crm.mapping.matchFieldPlaceholder')}
              emptyText={t('settings.integrations.crm.mapping.notConfigured')}
              disabled={!canWrite || propertiesLoading}
              className="w-full max-w-md"
            />
            <p className="text-sm text-muted-foreground">
              {t('settings.integrations.crm.mapping.matchRemoteFieldHelp')}
            </p>
          </>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          {t('settings.integrations.crm.mapping.inboundLabel', { name })}
        </p>
        <FacetedMultiSelect
          label={t('settings.integrations.crm.mapping.inboundPlaceholder', { name })}
          options={propertyOptions}
          value={inbound}
          onChange={setInbound}
          emptyText={t('settings.integrations.crm.mapping.notConfigured')}
          maxBadges={6}
        />
        <p className="text-sm text-muted-foreground">
          {t('settings.integrations.crm.mapping.inboundHelp', { name })}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          {t('settings.integrations.crm.mapping.outboundLabel', { name })}
        </p>
        <FacetedMultiSelect
          label={t('settings.integrations.crm.mapping.outboundPlaceholder')}
          options={attributeOptions}
          value={outbound}
          onChange={setOutbound}
          emptyText={t('settings.integrations.crm.mapping.notConfigured')}
          maxBadges={6}
        />
        <p className="text-sm text-muted-foreground">
          {t('settings.integrations.crm.mapping.outboundHelp', { name })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <LoadingButton
          type="button"
          loading={saving}
          disabled={!canWrite || propertiesLoading}
          onClick={() => void submit(false)}
        >
          {t('settings.integrations.crm.mapping.save')}
        </LoadingButton>
        {mapping && (
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            disabled={!canWrite || removing}
            onClick={() => setRemoveOpen(true)}
          >
            {t('settings.integrations.crm.mapping.remove')}
          </Button>
        )}
      </div>

      <DestructiveConfirmDialog
        title={t('settings.integrations.crm.mapping.adoptTitle')}
        description={t('settings.integrations.crm.mapping.adoptDescription', { name })}
        confirmLabel={t('settings.integrations.crm.mapping.adoptConfirm')}
        cancelLabel={t('settings.common.cancel')}
        open={adoptOpen}
        onOpenChange={setAdoptOpen}
        onConfirm={() => void submit(true)}
        loading={saving}
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

CrmMappingSection.displayName = 'CrmMappingSection';
