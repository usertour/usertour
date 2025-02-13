import { Attribute } from '@/types/project';
import { useMutation } from '@apollo/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-ui/alert-dialog';
import { deleteAttribute } from '@usertour-ui/gql';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { useToast } from '@usertour-ui/use-toast';

export const AttributeDeleteForm = (props: {
  data: Attribute;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}) => {
  const { data, open, onOpenChange, onSubmit } = props;
  const [deleteMutation] = useMutation(deleteAttribute);
  const { toast } = useToast();

  const handleDeleteSubmit = async () => {
    if (!data) {
      return;
    }
    try {
      const ret = await deleteMutation({
        variables: {
          id: data.id,
        },
      });
      if (ret.data?.deleteAttribute?.id) {
        toast({
          variant: 'success',
          title: 'The attribute has been successfully deleted',
        });
        onSubmit(true);
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
          <AlertDialogAction onClick={handleDeleteSubmit}>Submit</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

AttributeDeleteForm.displayName = 'AttributeDeleteForm';
