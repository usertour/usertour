import { memo, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { useToast } from '@usertour/ui';
import { Segment } from '@usertour/types';
import { useDeleteSegment } from '@/hooks/use-delete-segment';
import { useDeleteCompanySegment } from '@/hooks/use-delete-company-segment';
import { segmentNamespace } from './segment-i18n';
import type { SegmentEntity } from './types';

export interface SegmentDeleteDialogProps {
  entity: SegmentEntity;
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const SegmentDeleteDialog = memo((props: SegmentDeleteDialogProps) => {
  const { entity, segment, open, onOpenChange, onSubmit } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const user = useDeleteSegment();
  const company = useDeleteCompanySegment();
  const { deleteSegmentById, loading } = entity === 'user' ? user : company;
  const ns = segmentNamespace(entity);

  const handleConfirm = useCallback(async () => {
    if (!segment?.id) {
      toast({
        variant: 'destructive',
        title: t(`${ns}.toast.segments.invalidSegment`),
      });
      onSubmit(false);
      return;
    }

    const result = await deleteSegmentById(segment.id);
    if (result.success) {
      toast({
        variant: 'success',
        title: t(`${ns}.toast.segments.segmentDeleted`, { segmentName: segment.name }),
      });
      onSubmit(true);
      onOpenChange(false);
    } else {
      toast({
        variant: 'destructive',
        title: result.error ?? t('common.unknownError'),
      });
      onSubmit(false);
    }
  }, [segment?.id, segment?.name, deleteSegmentById, onSubmit, onOpenChange, toast, t, ns]);

  return (
    <DestructiveConfirmDialog
      title={t(`${ns}.dialogs.deleteSegment.title`)}
      description={
        <Trans
          i18nKey={`${ns}.dialogs.deleteSegment.description`}
          values={{ segmentName: segment?.name ?? '' }}
          components={{ strong: <strong className="font-bold text-foreground" /> }}
        />
      }
      confirmLabel={t(`${ns}.dialogs.deleteSegment.confirmButton`)}
      cancelLabel={t(`${ns}.actions.cancel`)}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleConfirm}
      loading={loading}
    />
  );
});

SegmentDeleteDialog.displayName = 'SegmentDeleteDialog';
