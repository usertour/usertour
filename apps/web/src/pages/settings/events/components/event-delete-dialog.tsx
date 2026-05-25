import { Event } from '@usertour/types';
import { getErrorMessage } from '@usertour/helpers';
import { useDeleteEventMutation } from '@usertour/hooks';
import { DeleteConfirmDialog } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';
import { useTranslation } from 'react-i18next';

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
  const { invoke: deleteEvent, loading } = useDeleteEventMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDelete = async () => {
    if (!data?.id) {
      toast({ variant: 'destructive', title: t('settings.events.invalidData') });
      return;
    }
    try {
      const success = await deleteEvent(data.id);
      if (success) {
        toast({
          variant: 'success',
          title: t('settings.events.deleteSuccess'),
        });
        onSubmit(true);
        onOpenChange(false);
        return;
      }
      toast({ variant: 'destructive', title: t('settings.events.deleteFailure') });
      onSubmit(false);
    } catch (error) {
      onSubmit(false);
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <DeleteConfirmDialog
      resourceLabel={t('settings.events.deleteResource')}
      name={data.displayName}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      loading={loading}
      confirmLabel={t('settings.common.submit')}
    />
  );
};

EventDeleteDialog.displayName = 'EventDeleteDialog';
