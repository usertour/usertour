import { DestructiveConfirmDialog } from '@usertour/ui';
import { Trans, useTranslation } from 'react-i18next';
import { Segment } from '@usertour/types';
import { useToast } from '@usertour/use-toast';
import { memo, useCallback } from 'react';
import { useRemoveCompaniesFromSegment } from '@/hooks/use-remove-companies-from-segment';

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

  const handleConfirm = useCallback(async () => {
    if (!segment?.id) {
      toast({ variant: 'destructive', title: 'Invalid segment data' });
      await onSubmit(false);
      return;
    }

    const result = await removeCompanies(bizCompanyIds, segment.id);
    if (result.success) {
      toast({
        variant: 'success',
        title: t('companies.toast.segments.companiesRemoved', { count: result.count || 0 }),
      });
      await onSubmit(true);
    } else {
      toast({ variant: 'destructive', title: result.error ?? 'Unknown error' });
      await onSubmit(false);
    }
  }, [bizCompanyIds, segment?.id, removeCompanies, onSubmit, toast, t]);

  return (
    <DestructiveConfirmDialog
      title={t('companies.dialogs.removeCompaniesFromSegment.title')}
      description={
        <Trans
          i18nKey="companies.dialogs.removeCompaniesFromSegment.description"
          values={{ segmentName: segment.name }}
          components={{ strong: <strong className="font-bold text-foreground" /> }}
        />
      }
      confirmLabel={t('companies.dialogs.removeCompaniesFromSegment.confirmButton', {
        count: bizCompanyIds.length,
      })}
      cancelLabel={t('companies.actions.cancel')}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleConfirm}
      loading={loading}
    />
  );
});

BizCompanyRemoveDialog.displayName = 'BizCompanyRemoveDialog';
