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
import { deleteContent } from '@usertour-ui/gql';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { Content } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';

export const ContentDeleteForm = (props: {
  content: Content;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
  name: string;
}) => {
  const { content, open, onOpenChange, onSubmit, name } = props;
  const [mutation] = useMutation(deleteContent);
  const { toast } = useToast();

  const handleDeleteSubmit = async () => {
    try {
      const ret = await mutation({
        variables: {
          contentId: content.id,
        },
      });
      if (ret.data?.deleteContent?.success) {
        toast({
          variant: 'success',
          title: `The flow ${name} has been successfully deleted`,
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
            This action cannot be undone!The flow and all data associated with it will be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteSubmit}>Delete flow</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

ContentDeleteForm.displayName = 'ContentDeleteForm';
