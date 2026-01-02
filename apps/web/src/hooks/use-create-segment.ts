import { useMutation } from '@apollo/client';
import { createSegment } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';
import { CreateSegmentFormValues } from '@/pages/users/types/segment-form-schema';

interface CreateSegmentResult {
  success: boolean;
  error?: string;
}

export const useCreateSegment = () => {
  const [createMutation] = useMutation(createSegment);

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
  };
};
