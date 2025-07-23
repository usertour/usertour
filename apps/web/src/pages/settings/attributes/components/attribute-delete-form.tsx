import { Attribute } from '@usertour-packages/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { getErrorMessage } from '@usertour-packages/utils';
import { useToast } from '@usertour-packages/use-toast';
import { useDeleteAttributeMutation } from '@usertour-packages/shared-hooks';
import { LoadingButton } from '@/components/molecules/loading-button';

export const AttributeDeleteForm = (props: {
  data: Attribute;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}) => {
  const { data, open, onOpenChange, onSubmit } = props;
  const { invoke: deleteAttribute, loading: isDeleting } = useDeleteAttributeMutation();
  const { toast } = useToast();

  const handleDeleteSubmit = async () => {
    if (!data) {
      return;
    }

    try {
      const success = await deleteAttribute(data.id);
      if (success) {
        toast({
          variant: 'success',
          title: 'The attribute has been successfully deleted',
        });
        onSubmit(true);
        onOpenChange(false);
        return;
      }
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
            This action cannot be undone. This will permanently delete the attribute{' '}
            <span className="font-bold text-foreground">{data.displayName}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <LoadingButton onClick={handleDeleteSubmit} variant="destructive" loading={isDeleting}>
            Submit
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

AttributeDeleteForm.displayName = 'AttributeDeleteForm';
