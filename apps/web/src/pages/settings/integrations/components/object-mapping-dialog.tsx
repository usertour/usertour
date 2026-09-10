import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '@usertour/helpers';
import {
  type IntegrationRemoteProperty,
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
  localDataTypeFor,
  remotePropertyNameFor,
} from '@usertour/constants';
import type {
  Attribute,
  SyncLocalObject,
  SyncMatchStrategy,
  SyncRemoteObject,
} from '@usertour/types';
import { AttributeTypeChip } from '@/components/attribute-type-chip';
import {
  SYNC_HIGH_CHURN_ATTRIBUTES,
  MappingFieldChip,
  ObjectPairTitle,
  MappingPairRow,
  objectLabelKeys,
} from './object-mapping-parts';

export interface ObjectMappingDialogProps {
  entry: IntegrationCatalogEntry;
  integration: Integration;
  remoteObject: SyncRemoteObject;
  localObject: SyncLocalObject;
  /** The saved mapping being edited; absent when setting the pair up. */
  mapping: IntegrationObjectMapping | undefined;
  properties: IntegrationRemoteProperty[];
  /** Provider metadata still loading: the provider-side pickers wait. */
  propertiesLoading?: boolean;
  attributes: Attribute[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The Usertour side of the match rule: the email attribute or the identify()/group() id. */
type MatchLocalField = 'email' | 'externalId';

const localFieldFor = (strategy: SyncMatchStrategy): MatchLocalField =>
  strategy === 'email' ? 'email' : 'externalId';

/**
 * Editor for one object pair (ADR 0013 §4-6). Both sync lists are pairs
 * whose far side is derived, never chosen: a provider property synced in
 * becomes an attribute of the same name (owned by the provider), an
 * attribute written back becomes a `usertour_*` property in the Usertour
 * group. The rows show that derived side so the rule is visible while
 * picking, and a badge says whether saving creates it or takes it over.
 */
export const ObjectMappingDialog = (props: ObjectMappingDialogProps) => {
  const {
    entry,
    integration,
    remoteObject,
    localObject,
    mapping,
    properties,
    propertiesLoading = false,
    attributes,
    open,
    onOpenChange,
  } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const name = entry.name;
  const labels = objectLabelKeys(remoteObject, localObject);
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
    // Seed on the open transition (and when the row identity changes), not on
    // every poll: a running round rewrites the mapping's counts every few
    // seconds, and re-seeding on each would wipe the user's edits.
  }, [open, mapping?.id, emailAllowed]);

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
            ? `${property.label} ${t('settings.integrations.sync.mapping.readOnlySuffix')}`
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
    const matchStrategy: SyncMatchStrategy = matchLocal === 'email' ? 'email' : 'remoteField';
    if (!matchRemote) {
      toast({
        variant: 'destructive',
        title: t('settings.integrations.sync.mapping.matchRemoteRequired', { name }),
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
        toast({ variant: 'success', title: t('settings.integrations.sync.mapping.saved') });
      } else {
        toast({
          variant: 'destructive',
          title: t('settings.integrations.sync.mapping.saveFailed'),
        });
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
      return t('settings.integrations.sync.mapping.matchLocalEmail');
    }
    return localObject === 'user'
      ? t('settings.integrations.sync.mapping.matchLocalUserId')
      : t('settings.integrations.sync.mapping.matchLocalCompanyId');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-5xl flex-col" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            <ObjectPairTitle
              provider={entry.provider}
              providerName={name}
              remoteLabel={t(labels.remote)}
              localLabel={t(labels.local)}
              size="sm"
            />
          </DialogTitle>
        </DialogHeader>

        {/* The popups portal into this wrapper: DialogContent lays its children
            out with a gap, so a portal node landing there as its own item would
            add one. The wrapper itself must not scroll — the popups are
            positioned absolutely inside it and an overflow here would clip
            them — so the field list scrolls in the div below, and the header
            and footer stay put however many fields are mapped. */}
        <div ref={setContainer} className="relative flex min-h-0 flex-1 flex-col">
          <TooltipProvider>
            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
              <div className="space-y-6 py-2">
                <section className="space-y-2">
                  <p className="text-sm font-medium">
                    {t('settings.integrations.sync.mapping.matchLabel')}
                  </p>
                  <MappingPairRow
                    connector="equals"
                    left={
                      <ComboboxSelect
                        value={matchRemote}
                        onValueChange={setMatchRemote}
                        options={matchOptions}
                        placeholder={t(
                          'settings.integrations.sync.mapping.matchRemotePlaceholder',
                          {
                            name,
                          },
                        )}
                        searchPlaceholder={t('settings.integrations.sync.mapping.searchProperties')}
                        emptyText={t('settings.integrations.sync.mapping.noMatches')}
                        container={container}
                        className="w-full"
                        disabled={propertiesLoading}
                      />
                    }
                    right={
                      emailAllowed ? (
                        <Select
                          value={matchLocal}
                          onValueChange={(value) =>
                            handleMatchLocalChange(value as MatchLocalField)
                          }
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
                        <MappingFieldChip
                          side="local"
                          provider={entry.provider}
                          label={localMatchLabel('externalId')}
                        />
                      )
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    {matchLocal === 'email'
                      ? t('settings.integrations.sync.mapping.matchEmailHelp', { name })
                      : t('settings.integrations.sync.mapping.matchRemoteFieldHelp')}
                  </p>
                </section>

                <section className="space-y-2 rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">
                    {t('settings.integrations.sync.mapping.inboundTitle', { name })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.integrations.sync.mapping.inboundHelp', { name })}
                  </p>
                  <div className="space-y-2 pt-1">
                    {inbound.map((remote) => {
                      const property = propertyByName.get(remote);
                      const existing = attributeByCode.get(remote);
                      const adopt = !!existing && (existing.source ?? 'internal') === 'internal';
                      return (
                        <MappingPairRow
                          key={remote}
                          connector="arrow"
                          left={
                            <MappingFieldChip
                              side="remote"
                              provider={entry.provider}
                              label={property?.label ?? remote}
                              hint={remote}
                            />
                          }
                          right={
                            <MappingFieldChip
                              side="local"
                              provider={entry.provider}
                              label={property?.label ?? remote}
                              trailing={
                                property && (
                                  <AttributeTypeChip
                                    dataType={localDataTypeFor(property)}
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
                                  {t('settings.integrations.sync.mapping.newBadge')}
                                </Badge>
                              )}
                              {adopt && (
                                <Tooltip>
                                  <TooltipTrigger type="button" className="cursor-help">
                                    <Badge variant="warning" className="px-1.5 py-0 font-normal">
                                      {t('settings.integrations.sync.mapping.existingBadge')}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    {t('settings.integrations.sync.mapping.existingHint', { name })}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                                aria-label={t('settings.integrations.sync.mapping.removeRow')}
                                onClick={() =>
                                  setInbound(inbound.filter((item) => item !== remote))
                                }
                              >
                                <RiCloseLine className="h-4 w-4" />
                              </Button>
                            </>
                          }
                        />
                      );
                    })}
                    <MappingPairRow
                      connector="arrow"
                      left={
                        <ComboboxSelect
                          value=""
                          onValueChange={(value) => setInbound([...inbound, value])}
                          options={inboundOptions}
                          placeholder={t('settings.integrations.sync.mapping.addInbound', { name })}
                          searchPlaceholder={t(
                            'settings.integrations.sync.mapping.searchProperties',
                          )}
                          emptyText={t('settings.integrations.sync.mapping.noMatches')}
                          container={container}
                          className="w-full"
                          disabled={propertiesLoading}
                        />
                      }
                      right={
                        <MappingFieldChip
                          side="local"
                          provider={entry.provider}
                          label="…"
                          placeholder
                        />
                      }
                    />
                  </div>
                </section>

                <section className="space-y-2 rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">
                    {t('settings.integrations.sync.mapping.outboundTitle', { name })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.integrations.sync.mapping.outboundHelp', { name })}
                  </p>
                  <div className="space-y-2 pt-1">
                    {outbound.map((code) => {
                      const attribute = attributeByCode.get(code);
                      const remoteName = remotePropertyNameFor(localObject, code);
                      const remoteExists = propertyByName.has(remoteName);
                      const churny = SYNC_HIGH_CHURN_ATTRIBUTES.has(code);
                      return (
                        <MappingPairRow
                          key={code}
                          connector="arrow"
                          left={
                            <MappingFieldChip
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
                                      {t('settings.integrations.sync.mapping.churnWarning', {
                                        name,
                                      })}
                                    </TooltipContent>
                                  </Tooltip>
                                )
                              }
                            />
                          }
                          right={
                            <MappingFieldChip
                              side="remote"
                              provider={entry.provider}
                              label={remoteName}
                            />
                          }
                          trailing={
                            <>
                              {!remoteExists && (
                                <Badge variant="default" className="px-1.5 py-0 font-normal">
                                  {t('settings.integrations.sync.mapping.newBadge')}
                                </Badge>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                                aria-label={t('settings.integrations.sync.mapping.removeRow')}
                                onClick={() =>
                                  setOutbound(outbound.filter((item) => item !== code))
                                }
                              >
                                <RiCloseLine className="h-4 w-4" />
                              </Button>
                            </>
                          }
                        />
                      );
                    })}
                    <MappingPairRow
                      connector="arrow"
                      left={
                        <ComboboxSelect
                          value=""
                          onValueChange={(value) => setOutbound([...outbound, value])}
                          options={outboundOptions}
                          placeholder={t('settings.integrations.sync.mapping.addOutbound')}
                          searchPlaceholder={t(
                            'settings.integrations.sync.mapping.searchAttributes',
                          )}
                          emptyText={t('settings.integrations.sync.mapping.noMatches')}
                          container={container}
                          className="w-full"
                        />
                      }
                      right={
                        <MappingFieldChip
                          side="remote"
                          provider={entry.provider}
                          label="…"
                          placeholder
                        />
                      }
                    />
                  </div>
                </section>
              </div>
            </div>
          </TooltipProvider>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {t('settings.integrations.sync.mapping.dialogNote')}
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
              {t('settings.integrations.sync.mapping.save')}
            </LoadingButton>
          </div>
        </DialogFooter>

        <DestructiveConfirmDialog
          title={t('settings.integrations.sync.mapping.adoptTitle')}
          description={t('settings.integrations.sync.mapping.adoptDescription', { name })}
          confirmLabel={t('settings.integrations.sync.mapping.adoptConfirm')}
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

ObjectMappingDialog.displayName = 'ObjectMappingDialog';
