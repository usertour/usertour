import { DestructiveConfirmDialog } from '@usertour/ui';
import { useDeleteSegment } from '@/hooks/use-delete-segment';
import { Segment } from '@usertour/types';
import { memo, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useToast } from '@usertour/use-toast';

interface UserSegmentDeleteDialogProps {
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

export const UserSegmentDeleteDialog = memo((props: UserSegmentDeleteDialogProps) => {
  const { segment, open, onOpenChange, onSubmit } = props;
  const { deleteSegmentById, loading } = useDeleteSegment();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleConfirm = useCallback(async () => {
    if (!segment?.id) {
      toast({ variant: 'destructive', title: t('users.toast.segments.invalidSegment') });
      return;
    }

    const result = await deleteSegmentById(segment.id);
    if (result.success) {
      toast({
        variant: 'success',
        title: t('users.toast.segments.segmentDeleted', { segmentName: segment.name }),
      });
      onSubmit();
      onOpenChange(false);
    } else {
      toast({ variant: 'destructive', title: result.error ?? t('common.unknownError') });
    }
  }, [segment?.id, segment?.name, deleteSegmentById, onSubmit, onOpenChange, toast, t]);

  return (
    <DestructiveConfirmDialog
      title={t('users.dialogs.deleteSegment.title')}
      description={
        <Trans
          i18nKey="users.dialogs.deleteSegment.description"
          values={{ segmentName: segment?.name ?? '' }}
          components={{ strong: <strong className="font-bold text-foreground" /> }}
        />
      }
      confirmLabel={t('users.dialogs.deleteSegment.confirmButton')}
      cancelLabel={t('users.actions.cancel')}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleConfirm}
      loading={loading}
    />
  );
});

UserSegmentDeleteDialog.displayName = 'UserSegmentDeleteDialog';
