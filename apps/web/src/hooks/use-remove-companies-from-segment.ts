import { useMutation } from '@apollo/client';
import { deleteBizCompanyOnSegment } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';

interface RemoveCompaniesResult {
  success: boolean;
  count?: number;
  error?: string;
}

export const useRemoveCompaniesFromSegment = () => {
  const [removeMutation, { loading }] = useMutation(deleteBizCompanyOnSegment);

  const removeCompanies = useCallback(
    async (companyIds: string[], segmentId: string): Promise<RemoveCompaniesResult> => {
      if (companyIds.length === 0) {
        return { success: false, error: 'No companies selected' };
      }

      const data = {
        bizCompanyIds: companyIds,
        segmentId,
      };

      try {
        const ret = await removeMutation({ variables: { data } });
        if (ret.data?.deleteBizCompanyOnSegment?.success) {
          return { success: true, count: ret.data.deleteBizCompanyOnSegment.count };
        }
        return { success: false, error: 'Remove operation failed' };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },
    [removeMutation],
  );

  return {
    removeCompanies,
    loading,
  };
};
