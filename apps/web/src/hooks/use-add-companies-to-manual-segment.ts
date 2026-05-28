import { useMutation } from '@apollo/client';
import { createBizCompanyOnSegment } from '@usertour/gql';
import { useCompanyListContext } from '@/contexts/company-list-context';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/ui';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Segment } from '@usertour/types';

/**
 * Hook to handle adding companies to manual segments. Mirrors
 * `useAddUsersToSegment` — the hook owns refetch + toast triage so
 * consumers don't have to wire `useCompanyListContext` + `useToast` at
 * every call site. Returns `Promise<boolean>`; callers don't see
 * `count` directly (it's used inside the toast).
 */
export const useAddCompaniesToManualSegment = () => {
  const [createMutation, { loading }] = useMutation(createBizCompanyOnSegment);
  const { refetch } = useCompanyListContext();
  const { toast } = useToast();
  const { t } = useTranslation();

  const addCompanies = useCallback(
    async (companyIds: string[], segment: Segment): Promise<boolean> => {
      // Validate inputs
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
          toast({
            variant: 'success',
            title: t('companies.toast.segments.companiesAdded', {
              count: ret.data.createBizCompanyOnSegment.count,
              segmentName: segment.name,
            }),
          });
          refetch();
          return true;
        }

        // Handle unexpected response
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
    [createMutation, refetch, toast, t],
  );

  return {
    addCompanies,
    isAdding: loading,
  };
};
