import { Event } from '@usertour/types';
import { getErrorMessage } from '@usertour/helpers';
import { useDeleteEventMutation } from '@usertour/hooks';
import { DeleteConfirmDialog } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';

interface EventDeleteFormProps {
  data: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const EventDeleteForm = ({ data, open, onOpenChange, onSubmit }: EventDeleteFormProps) => {
  const { invoke: deleteEvent, loading } = useDeleteEventMutation();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!data?.id) {
      toast({ variant: 'destructive', title: 'Invalid event data' });
      return;
    }
    try {
      const success = await deleteEvent(data.id);
      if (success) {
        toast({
          variant: 'success',
          title: 'The event has been successfully deleted',
        });
        onSubmit(true);
        onOpenChange(false);
        return;
      }
      toast({ variant: 'destructive', title: 'Failed to delete event' });
      onSubmit(false);
    } catch (error) {
      onSubmit(false);
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <DeleteConfirmDialog
      resourceLabel="event"
      name={data.displayName}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      loading={loading}
      confirmLabel="Submit"
    />
  );
};

EventDeleteForm.displayName = 'EventDeleteForm';
