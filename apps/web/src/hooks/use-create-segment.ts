import { useMutation } from '@apollo/client';
import { createSegment } from '@usertour/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';
import { CreateSegmentFormValues } from '@/components/segments/segment-form-schema';

interface CreateSegmentResult {
  success: boolean;
  error?: string;
}

export const useCreateSegment = () => {
  const [createMutation, { loading }] = useMutation(createSegment);

  const createSegmentAsync = useCallback(
    async (
      formValues: CreateSegmentFormValues,
      environmentId: string | undefined,
    ): Promise<CreateSegmentResult> => {
      try {
        const data = {
          ...formValues,
          bizType: 'USER',
          data: [],
          environmentId,
        };
        const ret = await createMutation({ variables: { data } });

        if (!ret.data?.createSegment?.id) {
          return { success: false, error: 'Create operation failed' };
        }

        return { success: true };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },
    [createMutation],
  );

  return {
    createSegmentAsync,
    loading,
  };
};
