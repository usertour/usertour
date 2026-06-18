import { memo, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { DestructiveConfirmDialog, useToast } from '@usertour/ui';
import { Segment } from '@usertour/types';
import { useRemoveUsersFromSegment } from '@/hooks/use-remove-users-from-segment';
import { useRemoveCompaniesFromSegment } from '@/hooks/use-remove-companies-from-segment';
import { segmentNamespace, segmentSubject } from './segment-i18n';
import type { SegmentEntity } from './types';

export interface BulkRemoveFromSegmentDialogProps {
  entity: SegmentEntity;
  /** Selected user IDs (entity='user') or company IDs (entity='company'). */
  ids: string[];
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (success: boolean) => void;
}

export const BulkRemoveFromSegmentDialog = memo((props: BulkRemoveFromSegmentDialogProps) => {
  const { entity, ids = [], segment, open, onOpenChange, onSubmit } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const user = useRemoveUsersFromSegment();
  const company = useRemoveCompaniesFromSegment();
  const removeFn = entity === 'user' ? user.removeUsers : company.removeCompanies;
  const loading = entity === 'user' ? user.loading : company.loading;
  const ns = segmentNamespace(entity);
  const subject = segmentSubject(entity); // 'Users' | 'Companies'

  const handleConfirm = useCallback(async () => {
    if (!segment?.id) {
      toast({
        variant: 'destructive',
        title: t(`${ns}.toast.segments.invalidSegment`),
      });
      onSubmit?.(false);
      return;
    }
    if (!ids || ids.length === 0) {
      toast({
        variant: 'destructive',
        title: t(
          entity === 'user'
            ? `${ns}.toast.segments.noUsersSelected`
            : `${ns}.toast.segments.noCompaniesSelected`,
        ),
      });
      onSubmit?.(false);
      return;
    }

    const result = await removeFn(ids, segment.id);
    if (result.success) {
      toast({
        variant: 'success',
        // Fall back to ids.length on nullable server count (same reason
        // as bulk-delete-from-segment-dialog). `??` not `||` so a real 0
        // doesn't get masked by the fallback.
        title: t(`${ns}.toast.segments.${ns}Removed`, { count: result.count ?? ids.length }),
      });
      onSubmit?.(true);
      onOpenChange(false);
    } else {
      toast({
        variant: 'destructive',
        title: result.error ?? t('common.unknownError'),
      });
      onSubmit?.(false);
    }
  }, [entity, ids, segment?.id, removeFn, onSubmit, onOpenChange, toast, t, ns]);

  return (
    <DestructiveConfirmDialog
      title={t(`${ns}.dialogs.remove${subject}FromSegment.title`)}
      description={
        <Trans
          i18nKey={`${ns}.dialogs.remove${subject}FromSegment.description`}
          values={{ segmentName: segment?.name ?? '' }}
          components={{ strong: <strong className="font-bold text-foreground" /> }}
        />
      }
      confirmLabel={t(`${ns}.dialogs.remove${subject}FromSegment.confirmButton`, {
        count: ids.length,
      })}
      cancelLabel={t(`${ns}.actions.cancel`)}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleConfirm}
      loading={loading}
    />
  );
});

BulkRemoveFromSegmentDialog.displayName = 'BulkRemoveFromSegmentDialog';
