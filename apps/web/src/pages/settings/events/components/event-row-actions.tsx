import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEventListContext } from '@/contexts/event-list-context';
import { useAppContext } from '@/contexts/app-context';
import { Event } from '@usertour/types';
import { Delete2Icon, EditIcon } from '@usertour/icons';
import { ResourceRowActions } from '@usertour/ui';
import { EventDeleteDialog } from './event-delete-dialog';
import { EventEditDialog } from './event-edit-dialog';

interface EventRowActionsProps {
  event: Event;
}

export const EventRowActions = (props: EventRowActionsProps) => {
  const { event } = props;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { refetch } = useEventListContext();
  const { isViewOnly } = useAppContext();
  const { t } = useTranslation();

  return (
    <>
      <ResourceRowActions
        disabled={event.predefined || isViewOnly}
        disabledHint={
          event.predefined ? (
            <p>
              {t('settings.common.predefinedTooltip', {
                resource: t('settings.events.predefinedResource'),
              })}
            </p>
          ) : undefined
        }
        items={[
          {
            key: 'edit',
            icon: <EditIcon className="w-6" width={12} height={12} />,
            label: t('settings.events.editMenuItem'),
            onSelect: () => setEditOpen(true),
          },
          {
            key: 'delete',
            icon: <Delete2Icon className="w-6" width={16} height={16} />,
            label: t('settings.events.deleteMenuItem'),
            destructive: true,
            separatorBefore: true,
            onSelect: () => setDeleteOpen(true),
          },
        ]}
      />
      <EventEditDialog
        event={event}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={() => refetch()}
      />
      <EventDeleteDialog
        data={event}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSubmit={() => refetch()}
      />
    </>
  );
};

EventRowActions.displayName = 'EventRowActions';
