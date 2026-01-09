import { useAppContext } from '@/contexts/app-context';
import { useMutation } from '@apollo/client';
import { deleteBizCompany } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';

interface DeleteCompanyResult {
  success: boolean;
  count?: number;
  error?: string;
}

export const useDeleteCompany = () => {
  const { environment } = useAppContext();
  const [deleteMutation, { loading }] = useMutation(deleteBizCompany);

  const deleteCompanies = useCallback(
    async (companyIds: string[]): Promise<DeleteCompanyResult> => {
      if (companyIds.length === 0 || !environment?.id) {
        return { success: false, error: 'Invalid parameters' };
      }

      const data = {
        ids: companyIds,
        environmentId: environment.id,
      };

      try {
        const ret = await deleteMutation({ variables: { data } });
        if (ret.data?.deleteBizCompany?.success) {
          return { success: true, count: ret.data.deleteBizCompany.count };
        }
        return { success: false, error: 'Delete operation failed' };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },
    [deleteMutation, environment?.id],
  );

  return {
    deleteCompanies,
    loading,
    environmentId: environment?.id,
  };
};
