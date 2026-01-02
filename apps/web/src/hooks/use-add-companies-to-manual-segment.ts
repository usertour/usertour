import { useMutation } from '@apollo/client';
import { createBizCompanyOnSegment } from '@usertour-packages/gql';
import { useCallback } from 'react';
import { Segment } from '@usertour/types';
import { getErrorMessage } from '@usertour/helpers';

interface AddCompaniesResult {
  success: boolean;
  count?: number;
  error?: string;
}

/**
 * Hook to handle adding companies to manual segments
 * @returns Object containing the add function and loading state
 */
export const useAddCompaniesToManualSegment = () => {
  const [createMutation, { loading }] = useMutation(createBizCompanyOnSegment);

  const addCompaniesToSegment = useCallback(
    async (companyIds: string[], segment: Segment): Promise<AddCompaniesResult> => {
      // Validate inputs
      if (!Array.isArray(companyIds) || companyIds.length === 0) {
        return { success: false, error: 'No companies selected' };
      }

      if (!segment || !segment.id) {
        return { success: false, error: 'Invalid segment' };
      }

      // Transform data for GraphQL mutation
      const companyOnSegment = companyIds.map((companyId) => ({
        bizCompanyId: companyId,
        segmentId: segment.id,
        data: {},
      }));

      const data = {
        companyOnSegment,
      };

      try {
        const ret = await createMutation({ variables: { data } });

        if (ret.data?.createBizCompanyOnSegment?.success) {
          return { success: true, count: ret.data.createBizCompanyOnSegment.count };
        }

        // Handle unexpected response
        return { success: false, error: 'Add operation failed' };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },
    [createMutation],
  );

  return {
    addCompaniesToSegment,
    isAdding: loading,
  };
};
