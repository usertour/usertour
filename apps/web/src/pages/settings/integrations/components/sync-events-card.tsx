import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '@usertour/helpers';
import {
  type Integration,
  useListIntegrationObjectMappingsQuery,
  useUpdateIntegrationEventsMutation,
} from '@usertour/hooks';
import { Checkbox, Switch, useToast } from '@usertour/ui';
import { type IntegrationCatalogEntry, SYNC_TIMELINE_EVENTS } from '@usertour/constants';
import { useAppContext } from '@/contexts/app-context';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';

export interface SyncEventsCardProps {
  entry: IntegrationCatalogEntry;
  integration: Integration;
  entitled: boolean;
}

/**
 * Events out (ADR 0013 §8): the switch and the milestone set written to the
 * provider's record timelines. Every change saves at once — there is nothing
 * to draft here — and the row's config is the single source, so the card
 * re-renders from the mutation's returned fields.
 */
export const SyncEventsCard = (props: SyncEventsCardProps) => {
  const { entry, integration, entitled } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isViewOnly } = useAppContext();
  const canWrite = !isViewOnly && entitled;
  const name = entry.name;
  const { invoke: updateEvents, loading: saving } = useUpdateIntegrationEventsMutation();
  const { mappings } = useListIntegrationObjectMappingsQuery(
    integration.id,
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const hasContactMapping = !!mappings?.some(
    (mapping) => mapping.localObject === 'user' && mapping.enabled,
  );
  const events = integration.config?.events;
  const enabled = events?.enabled ?? false;
  const selected = new Set(events?.codeNames ?? SYNC_TIMELINE_EVENTS);

  const save = async (input: { enabled?: boolean; codeNames?: string[] }) => {
    try {
      const saved = await updateEvents({ id: integration.id, ...input });
      if (saved) {
        toast({ variant: 'success', title: t('settings.integrations.sync.events.saved') });
      } else {
        toast({ variant: 'destructive', title: t('settings.integrations.form.saveFailed') });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };
  const toggleEvent = (codeName: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) {
      next.add(codeName);
    } else {
      next.delete(codeName);
    }
    void save({ codeNames: SYNC_TIMELINE_EVENTS.filter((candidate) => next.has(candidate)) });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-xl font-medium tracking-tight">
            {t('settings.integrations.sync.events.title')}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('settings.integrations.sync.events.description', { name })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm">{t('settings.integrations.sync.events.toggle', { name })}</span>
          <Switch
            className="shrink-0 data-[state=unchecked]:bg-input"
            checked={enabled}
            disabled={!canWrite || saving}
            onCheckedChange={(next) => void save({ enabled: next })}
          />
        </div>
      </div>

      {!hasContactMapping && (
        <p className="text-sm text-muted-foreground">
          {t('settings.integrations.sync.events.needsMapping')}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {SYNC_TIMELINE_EVENTS.map((codeName) => {
          const id = `timeline-event-${codeName}`;
          return (
            <label
              key={codeName}
              htmlFor={id}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:bg-muted/50"
            >
              <Checkbox
                id={id}
                checked={selected.has(codeName)}
                disabled={!canWrite || !enabled || saving}
                onCheckedChange={(checked) => toggleEvent(codeName, checked === true)}
              />
              <span>{t(`settings.integrations.sync.events.names.${codeName}`)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

SyncEventsCard.displayName = 'SyncEventsCard';
