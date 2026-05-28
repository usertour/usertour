import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { useListEventsQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { EventCreateDialog } from '@/components/events/event-create-dialog';
import { Badge, NewItemButton, ResourceListPage, type ResourceTableColumn } from '@usertour/ui';
import { RiShieldCheckFill } from '@usertour/icons';
import { Event } from '@usertour/types';
import { EventRowActions } from './components/event-row-actions';

const sortEvents = (events: readonly Event[]) =>
  [...events].sort((left, right) =>
    left.predefined === right.predefined ? 0 : left.predefined ? -1 : 1,
  );

const NewEventButton = ({ onSuccess }: { onSuccess: () => void }) => {
  const { isViewOnly } = useAppContext();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <NewItemButton
        onClick={() => setOpen(true)}
        disabled={isViewOnly}
        label={t('settings.events.newButton')}
      />
      <EventCreateDialog open={open} onOpenChange={setOpen} onSubmit={() => onSuccess()} />
    </>
  );
};

export const SettingsEventList = () => {
  const { project } = useAppContext();
  // Skipping `isRefetching` here on purpose — Apollo's `loading` flag stays
  // false for refetches, so the table updates in place instead of flashing
  // back to the skeleton when a row is added/edited/deleted.
  const { eventList, loading, refetch } = useListEventsQuery(
    project?.id,
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const { t } = useTranslation();

  const rows = useMemo(() => sortEvents(eventList ?? []), [eventList]);

  const columns: ResourceTableColumn<Event>[] = [
    {
      header: t('settings.events.columns.displayName'),
      className: 'truncate',
      cell: (event) => (
        <div className="flex flex-col">
          <span className="flex items-center gap-1.5 truncate">
            {event.displayName}
            {event.predefined ? (
              <Badge
                variant="secondary"
                className="gap-1 px-1.5 py-0 font-normal text-muted-foreground"
              >
                <RiShieldCheckFill className="h-3 w-3 text-foreground" />
                {t('settings.attributes.systemBadge')}
              </Badge>
            ) : null}
          </span>
          {event.description ? (
            <span className="text-xs text-muted-foreground truncate">{event.description}</span>
          ) : null}
        </div>
      ),
    },
    {
      header: t('settings.events.columns.codeName'),
      className: 'truncate',
      cell: (event) => event.codeName,
    },
    {
      header: '',
      headerClassName: 'w-20',
      cell: (event) => <EventRowActions event={event} />,
    },
  ];

  return (
    <ResourceListPage<Event>
      title={t('settings.events.title')}
      actions={<NewEventButton onSuccess={refetch} />}
      columns={columns}
      rows={rows}
      loading={loading}
      empty={t('settings.events.empty')}
      getRowKey={(event) => event.id}
    />
  );
};

SettingsEventList.displayName = 'SettingsEventList';
