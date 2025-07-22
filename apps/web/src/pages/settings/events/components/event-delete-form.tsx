import { Event } from '@usertour-ui/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-ui/alert-dialog';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { useDeleteEventMutation } from '@usertour-ui/shared-hooks';
import { useToast } from '@usertour-ui/use-toast';
import { LoadingButton } from '@/components/molecules/loading-button';

export const EventDeleteForm = (props: {
  data: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}) => {
  const { data, open, onOpenChange, onSubmit } = props;
  const { invoke: deleteEvent, loading } = useDeleteEventMutation();
  const { toast } = useToast();

  const handleDeleteSubmit = async () => {
    if (!data?.id) {
      toast({
        variant: 'destructive',
        title: 'Invalid event data',
      });
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
      toast({
        variant: 'destructive',
        title: 'Failed to delete event',
      });
      onSubmit(false);
    } catch (error) {
      onSubmit(false);
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  };

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the event{' '}
            <span className="font-bold text-foreground">{data.displayName}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <LoadingButton onClick={handleDeleteSubmit} loading={loading} variant="destructive">
            Submit
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

EventDeleteForm.displayName = 'EventDeleteForm';
