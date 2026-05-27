import { useMutation } from '@apollo/client';
import { deleteBizCompanyOnSegment } from '@usertour/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface RemoveCompaniesResult {
  success: boolean;
  count?: number;
  error?: string;
}

export const useRemoveCompaniesFromSegment = () => {
  const [removeMutation, { loading }] = useMutation(deleteBizCompanyOnSegment);
  const { t } = useTranslation();

  const removeCompanies = useCallback(
    async (companyIds: string[], segmentId: string): Promise<RemoveCompaniesResult> => {
      if (companyIds.length === 0) {
        return { success: false, error: t('companies.toast.segments.noCompaniesSelected') };
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
        return { success: false, error: t('companies.toast.segments.removeFailed') };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },
    [removeMutation, t],
  );

  return {
    removeCompanies,
    loading,
  };
};
