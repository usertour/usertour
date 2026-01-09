import { useMutation } from '@apollo/client';
import { updateSegment } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';
import { EditSegmentFormValues } from '@/pages/users/types/segment-form-schema';

interface UpdateSegmentResult {
  success: boolean;
  error?: string;
}

export const useUpdateSegment = () => {
  const [updateMutation, { loading }] = useMutation(updateSegment);

  const updateSegmentAsync = useCallback(
    async (segmentId: string, formValues: EditSegmentFormValues): Promise<UpdateSegmentResult> => {
      try {
        const data = {
          id: segmentId,
          name: formValues.name,
        };
        const response = await updateMutation({ variables: { data } });

        if (!response.data?.updateSegment?.id) {
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
