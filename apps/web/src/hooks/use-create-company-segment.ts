import { useMutation } from '@apollo/client';
import { createSegment } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';
import { CreateSegmentFormValues } from '@/pages/companies/types/segment-form-schema';

interface CreateCompanySegmentResult {
  success: boolean;
  error?: string;
}

export const useCreateCompanySegment = () => {
  const [createMutation, { loading }] = useMutation(createSegment);

  const createSegmentAsync = useCallback(
    async (
      formValues: CreateSegmentFormValues,
      environmentId: string | undefined,
    ): Promise<CreateCompanySegmentResult> => {
      try {
        const data = {
          ...formValues,
          bizType: 'COMPANY',
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
