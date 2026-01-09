import { useDeleteSegmentMutation } from '@usertour-packages/shared-hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';

interface DeleteSegmentResult {
  success: boolean;
  error?: string;
}

export const useDeleteSegment = () => {
  const { invoke: deleteSegment, loading } = useDeleteSegmentMutation();

  const deleteSegmentById = useCallback(
    async (segmentId: string): Promise<DeleteSegmentResult> => {
      try {
        const success = await deleteSegment(segmentId);
        if (success) {
          return { success: true };
        }
        return { success: false, error: 'Delete operation failed' };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },
    [deleteSegment],
  );

  return {
    deleteSegmentById,
    loading,
  };
};
