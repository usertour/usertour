import { useMutation } from '@apollo/client';
import { createBizCompanyOnSegment } from '@usertour-packages/gql';
import { useCallback } from 'react';
import { Segment } from '@usertour/types';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useTranslation } from 'react-i18next';

/**
 * Hook to handle adding companies to manual segments
 * @returns Object containing the add function and loading state
 */
export const useAddCompaniesToManualSegment = () => {
  const [createMutation, { loading }] = useMutation(createBizCompanyOnSegment);
  const { toast } = useToast();
  const { t } = useTranslation();

  const addCompaniesToSegment = useCallback(
    async (companyIds: string[], segment: Segment): Promise<boolean> => {
      // Validate inputs
      if (!companyIds || companyIds.length === 0) {
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
    [createMutation, toast, t],
  );

  return {
    addCompaniesToSegment,
    isAdding: loading,
  };
};
