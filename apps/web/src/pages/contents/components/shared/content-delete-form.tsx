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
import { useDeleteContentMutation } from '@usertour-ui/shared-hooks';
import { Content, ContentDataType } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
import { LoadingButton } from '@/components/molecules/loading-button';
import { useCallback } from 'react';

interface ContentDeleteFormProps {
  content: Content;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
  name: string;
}

export const ContentDeleteForm = ({
  content,
  open,
  onOpenChange,
  onSubmit,
  name,
}: ContentDeleteFormProps) => {
  const { invoke: deleteContent, loading } = useDeleteContentMutation();
  const { toast } = useToast();
  const contentType = content.type || ContentDataType.FLOW;
  const contentName = content.name;

  const handleDeleteSubmit = useCallback(async () => {
    if (!content?.id) {
      toast({
        variant: 'destructive',
        title: 'Invalid content data',
      });
      return;
    }

    try {
      const success = await deleteContent(content.id);

      if (success) {
        toast({
          variant: 'success',
          title: `The ${contentType} ${contentName} has been successfully deleted`,
        });
        onSubmit(true);
        onOpenChange(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to delete content',
        });
        onSubmit(false);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      onSubmit(false);
    }
  }, [content?.id, contentType, name, deleteContent, toast, onSubmit, onOpenChange]);

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone! The {contentType}{' '}
            <span className="font-bold text-foreground">{contentName}</span> and all data associated
            with it will be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <LoadingButton variant="destructive" onClick={handleDeleteSubmit} loading={loading}>
            Delete {contentType}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

ContentDeleteForm.displayName = 'ContentDeleteForm';
