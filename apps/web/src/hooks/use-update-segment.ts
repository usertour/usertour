import { useUpdateSegmentMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';
import { EditSegmentFormValues } from '@/components/segments/segment-form-schema';

interface UpdateSegmentResult {
  success: boolean;
  error?: string;
}

export const useUpdateSegment = () => {
  const { invoke: updateMutation, loading } = useUpdateSegmentMutation();

  const updateSegmentAsync = useCallback(
    async (segmentId: string, formValues: EditSegmentFormValues): Promise<UpdateSegmentResult> => {
      try {
        const success = await updateMutation({
          id: segmentId,
          name: formValues.name,
        });
        if (!success) {
          return { success: false, error: 'Update operation failed' };
        }
        return { success: true };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },
    [updateMutation],
  );

  return {
    updateSegmentAsync,
    loading,
  };
};
