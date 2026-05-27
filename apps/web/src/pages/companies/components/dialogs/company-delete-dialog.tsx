import { useTranslation } from 'react-i18next';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';
import { memo, useCallback } from 'react';
import { useDeleteCompany } from '@/hooks/use-delete-company';

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
  const count = bizCompanyIds.length;

  const handleConfirm = useCallback(async () => {
    if (!bizCompanyIds || count === 0) {
      toast({ variant: 'destructive', title: t('companies.toast.segments.noCompaniesSelected') });
      await onSubmit(false);
      return;
    }

    const result = await deleteCompanies(bizCompanyIds);
    if (result.success) {
      toast({
        variant: 'success',
        title: t('companies.toast.companies.companiesDeleted', { count: result.count ?? 0 }),
      });
      await onSubmit(true);
    } else {
      toast({ variant: 'destructive', title: result.error ?? t('common.unknownError') });
      await onSubmit(false);
    }
  }, [bizCompanyIds, count, deleteCompanies, onSubmit, toast, t]);

  return (
    <DestructiveConfirmDialog
      title={t('companies.dialogs.deleteCompanies.title', { count })}
      description={t('companies.dialogs.deleteCompanies.description', { count })}
      confirmLabel={t('companies.dialogs.deleteCompanies.confirmButton', { count })}
      cancelLabel={t('companies.actions.cancel')}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleConfirm}
      loading={loading}
    />
  );
});

BizCompanyDeleteDialog.displayName = 'BizCompanyDeleteDialog';
