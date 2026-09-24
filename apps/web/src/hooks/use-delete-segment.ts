import { useDeleteSegmentMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getDefinitionReferenceErrorMessage } from '@/utils/definition-references';

interface DeleteSegmentResult {
  success: boolean;
  error?: string;
}

export const useDeleteSegment = () => {
  const { invoke: deleteSegment, loading } = useDeleteSegmentMutation();
  const { t } = useTranslation();

  const deleteSegmentById = useCallback(
    async (segmentId: string): Promise<DeleteSegmentResult> => {
      try {
        const success = await deleteSegment(segmentId);
        if (success) {
          return { success: true };
        }
        return { success: false, error: 'Delete operation failed' };
      } catch (error) {
        return {
          success: false,
          error: getDefinitionReferenceErrorMessage(error, t) ?? getErrorMessage(error),
        };
      }
    },
    [deleteSegment, t],
  );

  return {
    deleteSegmentById,
    loading,
  };
};
