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
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { LoadingButton } from '@/components/molecules/loading-button';
import { useDeleteCompany } from '@/hooks/use-delete-company';
import { memo } from 'react';

interface BizCompanyDeleteDialogProps {
  bizCompanyIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => Promise<void>;
}

export const BizCompanyDeleteDialog = memo((props: BizCompanyDeleteDialogProps) => {
  const { open, onOpenChange, onSubmit, bizCompanyIds = [] } = props;
  const { t } = useTranslation();
  const { deleteCompanies, loading } = useDeleteCompany();
  const { toast } = useToast();

  const handleSuccess = useCallback(
    async (count: number) => {
      toast({
        variant: 'success',
        title: t('companies.toast.companies.companiesDeleted', {
          count,
          companyType: count === 1 ? 'company' : 'companies',
        }),
      });
      await onSubmit(true);
    },
    [onSubmit, toast, t],
  );

  const handleError = useCallback(
    async (errorMessage: string) => {
      toast({
        variant: 'destructive',
        title: errorMessage,
      });
      onSubmit(false);
    },
    [onSubmit, toast],
  );

  const handleDeleteSubmit = useCallback(async () => {
    if (!bizCompanyIds || bizCompanyIds.length === 0) {
      await handleError('No companies selected');
      return;
    }

    const result = await deleteCompanies(bizCompanyIds);
    if (result.success) {
      await handleSuccess(result.count ?? 0);
    } else {
      await handleError(result.error ?? 'Unknown error');
    }
  }, [bizCompanyIds, deleteCompanies, handleSuccess, handleError]);

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
});

BizCompanyDeleteDialog.displayName = 'BizCompanyDeleteDialog';
