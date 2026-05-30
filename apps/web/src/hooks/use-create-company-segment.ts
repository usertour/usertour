import { useCreateSegmentMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';
import { CreateSegmentFormValues } from '@/components/segments/segment-form-schema';

interface CreateCompanySegmentResult {
  success: boolean;
  error?: string;
}

export const useCreateCompanySegment = () => {
  const { invoke: createMutation, loading } = useCreateSegmentMutation();

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
        const ret = await createMutation({ data });

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
