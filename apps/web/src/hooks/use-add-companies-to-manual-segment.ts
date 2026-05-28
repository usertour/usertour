import { useMutation } from '@apollo/client';
import { createBizCompanyOnSegment } from '@usertour/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/ui';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Segment } from '@usertour/types';

/**
 * Mirror of `useAddUsersToSegment` for the company side. Owns the
 * mutation + toast triage; caller owns refetch (typically the `refetch`
 * returned from `useBizListCursor`).
 */
export const useAddCompaniesToManualSegment = () => {
  const [createMutation, { loading }] = useMutation(createBizCompanyOnSegment);
  const { toast } = useToast();
  const { t } = useTranslation();

  const addCompanies = useCallback(
    async (companyIds: string[], segment: Segment): Promise<boolean> => {
      if (!Array.isArray(companyIds) || companyIds.length === 0) {
        toast({
          variant: 'destructive',
          title: t('companies.toast.segments.noCompaniesSelected'),
        });
        return false;
      }

      if (!segment?.id || !segment?.name) {
        toast({
          variant: 'destructive',
          title: t('companies.toast.segments.invalidSegment'),
        });
        return false;
      }

      const companyOnSegment = companyIds.map((companyId) => ({
        bizCompanyId: companyId,
        segmentId: segment.id,
        data: {},
      }));

      try {
        const ret = await createMutation({ variables: { data: { companyOnSegment } } });

        if (ret.data?.createBizCompanyOnSegment?.success) {
          toast({
            variant: 'success',
            title: t('companies.toast.segments.companiesAdded', {
              count: ret.data.createBizCompanyOnSegment.count,
              segmentName: segment.name,
            }),
          });
          return true;
        }

        toast({
          variant: 'destructive',
          title: t('companies.toast.segments.addFailed'),
        });
        return false;
      } catch (error) {
        toast({
          variant: 'destructive',
          title: getErrorMessage(error),
        });
        return false;
      }
    },
    [createMutation, toast, t],
  );

  return {
    addCompanies,
    isAdding: loading,
  };
};
