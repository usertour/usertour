import { useAppContext } from '@/contexts/app-context';
import { useDeleteBizCompanyMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';

interface DeleteCompanyResult {
  success: boolean;
  count?: number;
  error?: string;
}

export const useDeleteCompany = () => {
  const { environment } = useAppContext();
  const { invoke: deleteMutation, loading } = useDeleteBizCompanyMutation();

  const deleteCompanies = useCallback(
    async (companyIds: string[]): Promise<DeleteCompanyResult> => {
      if (companyIds.length === 0 || !environment?.id) {
        return { success: false, error: 'Invalid parameters' };
      }
      try {
        const ret = await deleteMutation({
          ids: companyIds,
          environmentId: environment.id,
        });
        if (ret.success) {
          return { success: true, count: ret.count };
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
