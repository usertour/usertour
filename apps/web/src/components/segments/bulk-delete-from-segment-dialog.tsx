import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';
import { useDeleteBizUser } from '@/hooks/use-delete-biz-user';
import { useDeleteCompany } from '@/hooks/use-delete-company';
import { segmentNamespace, segmentSubject } from './segment-i18n';
import type { SegmentEntity } from './types';

export interface BulkDeleteFromSegmentDialogProps {
  entity: SegmentEntity;
  /** Selected user IDs (entity='user') or company IDs (entity='company'). */
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const BulkDeleteFromSegmentDialog = memo((props: BulkDeleteFromSegmentDialogProps) => {
  const { entity, ids = [], open, onOpenChange, onSubmit } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const user = useDeleteBizUser();
  const company = useDeleteCompany();
  // Both hooks expose the same `{ deleteX, loading }` shape; branch on entity.
  const deleteFn = entity === 'user' ? user.deleteUsers : company.deleteCompanies;
  const loading = entity === 'user' ? user.loading : company.loading;
  const ns = segmentNamespace(entity);
  const subject = segmentSubject(entity); // 'Users' | 'Companies'
  const count = ids.length;

  const handleConfirm = useCallback(async () => {
    if (!ids || count === 0) {
      toast({
        variant: 'destructive',
        title: t(
          entity === 'user'
            ? `${ns}.toast.segments.noUsersSelected`
            : `${ns}.toast.segments.noCompaniesSelected`,
        ),
      });
      onSubmit(false);
      return;
    }

    const result = await deleteFn(ids);
    if (result.success) {
      toast({
        variant: 'success',
        title: t(`${ns}.toast.${ns}.${ns}Deleted`, { count: result.count ?? 0 }),
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
  }, [entity, ids, count, deleteFn, onSubmit, onOpenChange, toast, t, ns]);

  return (
    <DestructiveConfirmDialog
      title={t(`${ns}.dialogs.delete${subject}.title`, { count })}
      description={t(`${ns}.dialogs.delete${subject}.description`, { count })}
      confirmLabel={t(`${ns}.dialogs.delete${subject}.confirmButton`, { count })}
      cancelLabel={t(`${ns}.actions.cancel`)}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleConfirm}
      loading={loading}
    />
  );
});

BulkDeleteFromSegmentDialog.displayName = 'BulkDeleteFromSegmentDialog';
