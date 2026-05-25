import { Event } from '@usertour/types';
import { useDeleteEventMutation } from '@usertour/hooks';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { Trans, useTranslation } from 'react-i18next';

interface EventDeleteDialogProps {
  data: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const EventDeleteDialog = ({
  data,
  open,
  onOpenChange,
  onSubmit,
}: EventDeleteDialogProps) => {
  const { invoke: deleteEvent } = useDeleteEventMutation();
  const { t } = useTranslation();

  return (
    <DestructiveConfirmDialog
      title={t('settings.common.deleteConfirm.title', {
        resource: t('settings.events.deleteResource'),
      })}
      description={
        <Trans
          i18nKey="settings.common.deleteConfirm.description"
          values={{ name: data.displayName }}
          components={{ strong: <strong className="font-bold text-foreground" /> }}
        />
      }
      confirmLabel={t('settings.common.deleteConfirm.confirm', {
        resource: t('settings.events.deleteResource'),
      })}
      cancelLabel={t('settings.common.cancel')}
      open={open}
      onOpenChange={onOpenChange}
      invoke={() => deleteEvent(data.id)}
      successToast={t('settings.events.deleteSuccess')}
      failureToast={t('settings.events.deleteFailure')}
      onSettled={onSubmit}
    />
  );
};

EventDeleteDialog.displayName = 'EventDeleteDialog';
