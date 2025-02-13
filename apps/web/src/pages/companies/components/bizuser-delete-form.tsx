import { useAppContext } from '@/contexts/app-context';
import { useCompanyListContext } from '@/contexts/company-list-context';
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
import { deleteBizCompany } from '@usertour-ui/gql';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { useToast } from '@usertour-ui/use-toast';
import { useCallback } from 'react';

interface BizCompanyDeleteFormProps {
  bizCompanyIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const BizCompanyDeleteForm = (props: BizCompanyDeleteFormProps) => {
  const { open, onOpenChange, onSubmit, bizCompanyIds = [] } = props;
  const [mutation] = useMutation(deleteBizCompany);
  const { refetch } = useCompanyListContext();
  const { environment } = useAppContext();
  const { toast } = useToast();

  const handleDeleteSubmit = useCallback(async () => {
    if (bizCompanyIds.length === 0 || !environment?.id) {
      return;
    }
    const data = {
      ids: bizCompanyIds,
      environmentId: environment.id,
    };
    try {
      const ret = await mutation({ variables: { data } });
      if (ret.data?.deleteBizCompany?.success) {
        toast({
          variant: 'success',
          title: `${ret.data?.deleteBizCompany.count} users has been successfully deleted`,
        });
        await refetch();
        onSubmit(true);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      onSubmit(false);
    }
  }, [bizCompanyIds, environment?.id]);

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm deleting the users</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete all traces of the selected users from your account. Including in
            analytics.
            <br />
            Confirm deleting the users?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteSubmit}>
            Yes, delete {bizCompanyIds.length} users
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

BizCompanyDeleteForm.displayName = 'BizCompanyDeleteForm';
