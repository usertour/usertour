import { useAppContext } from '@/contexts/app-context';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { deleteBizCompany } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { LoadingButton } from '@/components/molecules/loading-button';

interface BizCompanyDeleteDialogProps {
  bizCompanyIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => Promise<void>;
}

export const BizCompanyDeleteDialog = (props: BizCompanyDeleteDialogProps) => {
  const { open, onOpenChange, onSubmit, bizCompanyIds = [] } = props;
  const { t } = useTranslation();
  const [mutation, { loading }] = useMutation(deleteBizCompany);
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
        const count = ret.data?.deleteBizCompany.count;
        toast({
          variant: 'success',
          title: t('companies.toast.companies.companiesDeleted', {
            count,
            companyType: count === 1 ? 'company' : 'companies',
          }),
        });
        await onSubmit(true);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      onSubmit(false);
    }
  }, [bizCompanyIds, environment?.id, mutation, toast, onSubmit]);

  const isSingle = bizCompanyIds.length === 1;
  const companyType = isSingle ? 'company' : 'companies';

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isSingle
              ? t('companies.dialogs.deleteCompanies.titleSingle')
              : t('companies.dialogs.deleteCompanies.titleMultiple')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('companies.dialogs.deleteCompanies.description', { companyType })}
            <br />
            {t('companies.dialogs.deleteCompanies.descriptionConfirm', { companyType })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('companies.actions.cancel')}</AlertDialogCancel>
          <LoadingButton onClick={handleDeleteSubmit} variant="destructive" loading={loading}>
            {isSingle
              ? t('companies.dialogs.deleteCompanies.confirmButtonSingle')
              : t('companies.dialogs.deleteCompanies.confirmButtonMultiple', {
                  count: bizCompanyIds.length,
                })}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

BizCompanyDeleteDialog.displayName = 'BizCompanyDeleteDialog';
