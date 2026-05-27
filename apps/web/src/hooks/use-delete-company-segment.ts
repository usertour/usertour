import { useDeleteSegmentMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';

interface DeleteCompanySegmentResult {
  success: boolean;
  error?: string;
}

/**
 * Company-side mirror of `useDeleteSegment`. The underlying `deleteSegment`
 * mutation handles both user and company segments server-side (the entity is
 * inferred from the segment id), so this is functionally a delegate — its
 * existence is for symmetry with the user-side hook layer, which the shared
 * dialogs in `apps/web/src/components/segments/` depend on. Keep this
 * shape in lockstep with `use-delete-segment.ts`.
 */
export const useDeleteCompanySegment = () => {
  const { invoke: deleteSegment, loading } = useDeleteSegmentMutation();

  const deleteSegmentById = useCallback(
    async (segmentId: string): Promise<DeleteCompanySegmentResult> => {
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
