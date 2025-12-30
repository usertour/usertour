import { useDeleteSegmentMutation } from '@usertour-packages/shared-hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export const useDeleteSegment = () => {
  const { invoke: deleteSegment, loading } = useDeleteSegmentMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const deleteSegmentById = useCallback(
    async (segmentId: string, segmentName: string): Promise<boolean> => {
      try {
        const success = await deleteSegment(segmentId);
        if (success) {
          toast({
            variant: 'success',
            title: t('users.toast.segments.segmentDeleted', { segmentName }),
          });
          return true;
        }
        return false;
      } catch (error) {
        toast({
          variant: 'destructive',
          title: getErrorMessage(error),
        });
        return false;
      }
    },
    [deleteSegment, toast],
  );

  return {
    deleteSegmentById,
    loading,
  };
};
