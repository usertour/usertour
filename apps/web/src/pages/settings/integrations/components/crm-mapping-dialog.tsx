import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '@usertour/helpers';
import {
  type CrmRemoteProperty,
  type Integration,
  type IntegrationObjectMapping,
  useUpsertIntegrationObjectMappingMutation,
} from '@usertour/hooks';
import { RiAlertLine, RiCloseLine } from '@usertour/icons';
import {
  Badge,
  Button,
  ComboboxSelect,
  DestructiveConfirmDialog,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  LoadingButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from '@usertour/ui';
import {
  type IntegrationCatalogEntry,
  crmLocalDataTypeFor,
  crmRemotePropertyNameFor,
} from '@usertour/constants';
import type { Attribute, CrmLocalObject, CrmMatchStrategy, CrmRemoteObject } from '@usertour/types';
import { AttributeTypeChip } from '@/components/attribute-type-chip';
import {
  CRM_HIGH_CHURN_ATTRIBUTES,
  CrmFieldChip,
  CrmObjectPairTitle,
  CrmPairRow,
  crmObjectLabelKeys,
} from './crm-mapping-parts';

export interface CrmMappingDialogProps {
  entry: IntegrationCatalogEntry;
  integration: Integration;
  remoteObject: CrmRemoteObject;
  localObject: CrmLocalObject;
  /** The saved mapping being edited; absent when setting the pair up. */
  mapping: IntegrationObjectMapping | undefined;
  properties: CrmRemoteProperty[];
  attributes: Attribute[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The Usertour side of the match rule: the email attribute or the identify()/group() id. */
type MatchLocalField = 'email' | 'externalId';

const localFieldFor = (strategy: CrmMatchStrategy): MatchLocalField =>
  strategy === 'email' ? 'email' : 'externalId';

/**
 * Editor for one object pair (ADR 0013 §4-6). Both sync lists are pairs
 * whose far side is derived, never chosen: a provider property synced in
 * becomes an attribute of the same name (owned by the provider), an
 * attribute written back becomes a `usertour_*` property in the Usertour
 * group. The rows show that derived side so the rule is visible while
 * picking, and a badge says whether saving creates it or takes it over.
 */
export const CrmMappingDialog = (props: CrmMappingDialogProps) => {
  const {
    entry,
    integration,
    remoteObject,
    localObject,
    mapping,
    properties,
    attributes,
    open,
    onOpenChange,
  } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const name = entry.name;
  const labels = crmObjectLabelKeys(remoteObject, localObject);
  const { invoke: saveMapping, loading: saving } = useUpsertIntegrationObjectMappingMutation();

  // Companies have no email, so their only rule is the id property.
  const emailAllowed = remoteObject === 'contact';
  const [matchLocal, setMatchLocal] = useState<MatchLocalField>('email');
  const [matchRemote, setMatchRemote] = useState('');
  const [inbound, setInbound] = useState<string[]>([]);
  const [outbound, setOutbound] = useState<string[]>([]);
  const [adoptOpen, setAdoptOpen] = useState(false);
  // Popups must mount inside the dialog to stay interactive under its scroll lock.
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  // Seed from the saved row each time the dialog opens; edits never leak out
  // of a cancelled session.
  useEffect(() => {
    if (!open) {
      return;
    }
    const strategy = mapping?.matchStrategy ?? (emailAllowed ? 'email' : 'remoteField');
    setMatchLocal(localFieldFor(strategy));
    setMatchRemote(mapping?.matchRemoteField ?? (strategy === 'email' ? 'email' : ''));
    setInbound(mapping?.inboundFields.map((field) => field.remote) ?? []);
    setOutbound(mapping?.outboundFields.map((field) => field.local) ?? []);
  }, [open, mapping, emailAllowed]);

  const propertyByName = useMemo(
    () => new Map(properties.map((property) => [property.name, property])),
    [properties],
  );
  const attributeByCode = useMemo(
    () => new Map(attributes.map((attribute) => [attribute.codeName, attribute])),
    [attributes],
  );
  const inboundSet = useMemo(() => new Set(inbound), [inbound]);
  const outboundSet = useMemo(() => new Set(outbound), [outbound]);

  const matchOptions = useMemo(
    () =>
      properties
        .filter((property) => property.type === 'string' && !property.readOnly)
        .map((property) => ({ value: property.name, label: property.label, hint: property.name })),
    [properties],
  );
  const inboundOptions = useMemo(
    () =>
      properties
        .filter((property) => !inboundSet.has(property.name))
        .map((property) => ({
          value: property.name,
          label: property.readOnly
            ? `${property.label} ${t('settings.integrations.crm.mapping.readOnlySuffix')}`
            : property.label,
          hint: property.name,
        })),
    [properties, inboundSet, t],
  );
  // Write-back candidates: Usertour-owned attributes not already synced in.
  const outboundOptions = useMemo(
    () =>
      attributes
        .filter(
          (attribute) =>
            (attribute.source ?? 'internal') === 'internal' &&
            !inboundSet.has(attribute.codeName) &&
            !outboundSet.has(attribute.codeName),
        )
        .map((attribute) => ({
          value: attribute.codeName,
          label: attribute.displayName,
          hint: attribute.codeName,
        })),
    [attributes, inboundSet, outboundSet],
  );

  const handleMatchLocalChange = (next: MatchLocalField) => {
    setMatchLocal(next);
    // The email rule reads the provider's email property unless told otherwise;
    // the id rule has no sensible default.
    setMatchRemote(next === 'email' ? 'email' : '');
  };

  const submit = async (adoptExisting: boolean) => {
    const matchStrategy: CrmMatchStrategy = matchLocal === 'email' ? 'email' : 'remoteField';
    if (!matchRemote) {
      toast({
        variant: 'destructive',
        title: t('settings.integrations.crm.mapping.matchRemoteRequired', { name }),
      });
      return;
    }
    try {
      const saved = await saveMapping({
        integrationId: integration.id,
        remoteObject,
        localObject,
        matchStrategy,
        matchRemoteField: matchRemote,
        inboundFields: inbound.map((remote) => ({ remote, local: remote })),
        outboundFields: outbound.map((local) => ({ local })),
        enabled: true,
        adoptExisting,
      });
      if (saved) {
        setAdoptOpen(false);
        onOpenChange(false);
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

  const localMatchLabel = (field: MatchLocalField) => {
    if (field === 'email') {
      return t('settings.integrations.crm.mapping.matchLocalEmail');
    }
    return localObject === 'user'
      ? t('settings.integrations.crm.mapping.matchLocalUserId')
      : t('settings.integrations.crm.mapping.matchLocalCompanyId');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            <CrmObjectPairTitle
              provider={entry.provider}
              providerName={name}
              remoteLabel={t(labels.remote)}
              localLabel={t(labels.local)}
              size="sm"
            />
          </DialogTitle>
        </DialogHeader>

        {/* The popups portal into this wrapper: DialogContent is a `grid gap-4`, so
            a portal node landing there as its own grid item would add a gap. */}
        <div ref={setContainer} className="relative">
          <TooltipProvider>
            <div className="space-y-6 py-2">
              <section className="space-y-2">
                <p className="text-sm font-medium">
                  {t('settings.integrations.crm.mapping.matchLabel')}
                </p>
                <CrmPairRow
                  connector="equals"
                  left={
                    <ComboboxSelect
                      value={matchRemote}
                      onValueChange={setMatchRemote}
                      options={matchOptions}
                      placeholder={t('settings.integrations.crm.mapping.matchRemotePlaceholder', {
                        name,
                      })}
                      searchPlaceholder={t('settings.integrations.crm.mapping.searchProperties')}
                      emptyText={t('settings.integrations.crm.mapping.noMatches')}
                      container={container}
                      className="w-full"
                    />
                  }
                  right={
                    emailAllowed ? (
                      <Select
                        value={matchLocal}
                        onValueChange={(value) => handleMatchLocalChange(value as MatchLocalField)}
                      >
                        <SelectTrigger className="w-full">
                          {localMatchLabel(matchLocal)}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">{localMatchLabel('email')}</SelectItem>
                          <SelectItem value="externalId">
                            {localMatchLabel('externalId')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <CrmFieldChip
                        side="local"
                        provider={entry.provider}
                        label={localMatchLabel('externalId')}
                      />
                    )
                  }
                />
                <p className="text-sm text-muted-foreground">
                  {matchLocal === 'email'
                    ? t('settings.integrations.crm.mapping.matchEmailHelp', { name })
                    : t('settings.integrations.crm.mapping.matchRemoteFieldHelp')}
                </p>
              </section>

              <section className="space-y-2 rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium">
                  {t('settings.integrations.crm.mapping.inboundTitle', { name })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('settings.integrations.crm.mapping.inboundHelp', { name })}
                </p>
                <div className="space-y-2 pt-1">
                  {inbound.map((remote) => {
                    const property = propertyByName.get(remote);
                    const existing = attributeByCode.get(remote);
                    const adopt = !!existing && (existing.source ?? 'internal') === 'internal';
                    return (
                      <CrmPairRow
                        key={remote}
                        connector="arrow"
                        left={
                          <CrmFieldChip
                            side="remote"
                            provider={entry.provider}
                            label={property?.label ?? remote}
                            hint={remote}
                          />
                        }
                        right={
                          <CrmFieldChip
                            side="local"
                            provider={entry.provider}
                            label={property?.label ?? remote}
                            trailing={
                              property && (
                                <AttributeTypeChip
                                  dataType={crmLocalDataTypeFor(property)}
                                  className="ml-auto"
                                />
                              )
                            }
                          />
                        }
                        trailing={
                          <>
                            {!existing && (
                              <Badge variant="default" className="px-1.5 py-0 font-normal">
                                {t('settings.integrations.crm.mapping.newBadge')}
                              </Badge>
                            )}
                            {adopt && (
                              <Tooltip>
                                <TooltipTrigger type="button" className="cursor-help">
                                  <Badge variant="warning" className="px-1.5 py-0 font-normal">
                                    {t('settings.integrations.crm.mapping.existingBadge')}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  {t('settings.integrations.crm.mapping.existingHint', { name })}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground"
                              aria-label={t('settings.integrations.crm.mapping.removeRow')}
                              onClick={() => setInbound(inbound.filter((item) => item !== remote))}
                            >
                              <RiCloseLine className="h-4 w-4" />
                            </Button>
                          </>
                        }
                      />
                    );
                  })}
                  <CrmPairRow
                    connector="arrow"
                    left={
                      <ComboboxSelect
                        value=""
                        onValueChange={(value) => setInbound([...inbound, value])}
                        options={inboundOptions}
                        placeholder={t('settings.integrations.crm.mapping.addInbound', { name })}
                        searchPlaceholder={t('settings.integrations.crm.mapping.searchProperties')}
                        emptyText={t('settings.integrations.crm.mapping.noMatches')}
                        container={container}
                        className="w-full"
                      />
                    }
                    right={
                      <CrmFieldChip side="local" provider={entry.provider} label="…" placeholder />
                    }
                  />
                </div>
              </section>

              <section className="space-y-2 rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium">
                  {t('settings.integrations.crm.mapping.outboundTitle', { name })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('settings.integrations.crm.mapping.outboundHelp', { name })}
                </p>
                <div className="space-y-2 pt-1">
                  {outbound.map((code) => {
                    const attribute = attributeByCode.get(code);
                    const remoteName = crmRemotePropertyNameFor(localObject, code);
                    const remoteExists = propertyByName.has(remoteName);
                    const churny = CRM_HIGH_CHURN_ATTRIBUTES.has(code);
                    return (
                      <CrmPairRow
                        key={code}
                        connector="arrow"
                        left={
                          <CrmFieldChip
                            side="local"
                            provider={entry.provider}
                            label={attribute?.displayName ?? code}
                            hint={code}
                            trailing={
                              churny && (
                                <Tooltip>
                                  <TooltipTrigger
                                    type="button"
                                    className="ml-auto inline-flex shrink-0 cursor-help"
                                  >
                                    <RiAlertLine className="h-4 w-4 text-amber-500" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    {t('settings.integrations.crm.mapping.churnWarning', { name })}
                                  </TooltipContent>
                                </Tooltip>
                              )
                            }
                          />
                        }
                        right={
                          <CrmFieldChip
                            side="remote"
                            provider={entry.provider}
                            label={remoteName}
                          />
                        }
                        trailing={
                          <>
                            {!remoteExists && (
                              <Badge variant="default" className="px-1.5 py-0 font-normal">
                                {t('settings.integrations.crm.mapping.newBadge')}
                              </Badge>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground"
                              aria-label={t('settings.integrations.crm.mapping.removeRow')}
                              onClick={() => setOutbound(outbound.filter((item) => item !== code))}
                            >
                              <RiCloseLine className="h-4 w-4" />
                            </Button>
                          </>
                        }
                      />
                    );
                  })}
                  <CrmPairRow
                    connector="arrow"
                    left={
                      <ComboboxSelect
                        value=""
                        onValueChange={(value) => setOutbound([...outbound, value])}
                        options={outboundOptions}
                        placeholder={t('settings.integrations.crm.mapping.addOutbound')}
                        searchPlaceholder={t('settings.integrations.crm.mapping.searchAttributes')}
                        emptyText={t('settings.integrations.crm.mapping.noMatches')}
                        container={container}
                        className="w-full"
                      />
                    }
                    right={
                      <CrmFieldChip side="remote" provider={entry.provider} label="…" placeholder />
                    }
                  />
                </div>
              </section>
            </div>
          </TooltipProvider>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {t('settings.integrations.crm.mapping.dialogNote')}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              {t('settings.common.cancel')}
            </Button>
            <LoadingButton type="button" loading={saving} onClick={() => void submit(false)}>
              {t('settings.integrations.crm.mapping.save')}
            </LoadingButton>
          </div>
        </DialogFooter>

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
      </DialogContent>
    </Dialog>
  );
};

CrmMappingDialog.displayName = 'CrmMappingDialog';
