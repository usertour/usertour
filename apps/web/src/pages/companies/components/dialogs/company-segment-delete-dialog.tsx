import { DestructiveConfirmDialog } from '@usertour/ui';
import { getErrorMessage } from '@usertour/helpers';
import { Trans, useTranslation } from 'react-i18next';
import { Segment } from '@usertour/types';
import { useToast } from '@usertour/use-toast';
import { useDeleteSegmentMutation } from '@usertour/hooks';
import { memo, useCallback } from 'react';

interface CompanySegmentDeleteDialogProps {
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const CompanySegmentDeleteDialog = memo(
  ({ segment, open, onOpenChange, onSubmit }: CompanySegmentDeleteDialogProps) => {
    const { t } = useTranslation();
    const { invoke: deleteSegment, loading } = useDeleteSegmentMutation();
    const { toast } = useToast();

    const handleConfirm = useCallback(async () => {
      if (!segment?.id) {
        toast({
          variant: 'destructive',
          title: t('companies.dialogs.deleteSegment.invalidData'),
        });
        onSubmit(false);
        return;
      }

      try {
        const success = await deleteSegment(segment.id);
        if (success) {
          toast({
            variant: 'success',
            title: t('companies.dialogs.deleteSegment.deleteSuccess', {
              segmentName: segment.name,
            }),
          });
          onSubmit(true);
          onOpenChange(false);
        } else {
          toast({
            variant: 'destructive',
            title: t('companies.dialogs.deleteSegment.deleteFailure'),
          });
          onSubmit(false);
        }
      } catch (error) {
        toast({ variant: 'destructive', title: getErrorMessage(error) });
        onSubmit(false);
      }
    }, [segment?.id, segment?.name, deleteSegment, onSubmit, onOpenChange, toast, t]);

    return (
      <DestructiveConfirmDialog
        title={t('companies.dialogs.deleteSegment.title')}
        description={
          <Trans
            i18nKey="companies.dialogs.deleteSegment.description"
            values={{ segmentName: segment.name }}
            components={{ strong: <strong className="font-bold text-foreground" /> }}
          />
        }
        confirmLabel={t('companies.dialogs.deleteSegment.confirmButton')}
        cancelLabel={t('companies.actions.cancel')}
        open={open}
        onOpenChange={onOpenChange}
        onConfirm={handleConfirm}
        loading={loading}
      />
    );
  },
);

CompanySegmentDeleteDialog.displayName = 'CompanySegmentDeleteDialog';
