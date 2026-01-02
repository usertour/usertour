import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { useTranslation } from 'react-i18next';
import { Segment } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { LoadingButton } from '@/components/molecules/loading-button';
import { useRemoveCompaniesFromSegment } from '@/hooks/use-remove-companies-from-segment';
import { memo } from 'react';

interface BizCompanyRemoveDialogProps {
  bizCompanyIds: string[];
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => Promise<void>;
}

export const BizCompanyRemoveDialog = memo((props: BizCompanyRemoveDialogProps) => {
  const { bizCompanyIds, open, onOpenChange, onSubmit, segment } = props;
  const { t } = useTranslation();
  const { removeCompanies, loading } = useRemoveCompaniesFromSegment();
  const { toast } = useToast();

  const handleSuccess = useCallback(
    async (count: number) => {
      toast({
        variant: 'success',
        title: t('companies.toast.segments.companiesRemoved', { count }),
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

  const handleSubmit = useCallback(async () => {
    if (!segment?.id) {
      await handleError('Invalid segment data');
      return;
    }

    const result = await removeCompanies(bizCompanyIds, segment.id);
    if (result.success) {
      await handleSuccess(result.count || 0);
    } else {
      await handleError(result.error ?? 'Unknown error');
    }
  }, [bizCompanyIds, segment?.id, removeCompanies, handleSuccess, handleError]);

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('companies.dialogs.removeCompaniesFromSegment.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('companies.dialogs.removeCompaniesFromSegment.description', {
              segmentName: segment.name,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('companies.actions.cancel')}</AlertDialogCancel>
          <LoadingButton onClick={handleSubmit} loading={loading}>
            {t('companies.dialogs.removeCompaniesFromSegment.confirmButton', {
              count: bizCompanyIds.length,
            })}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

BizCompanyRemoveDialog.displayName = 'BizCompanyRemoveDialog';
