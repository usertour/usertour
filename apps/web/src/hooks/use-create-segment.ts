import { useMutation } from '@apollo/client';
import { createSegment } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { CreateSegmentFormValues } from '@/pages/users/types/segment-form-schema';
import { useTranslation } from 'react-i18next';

export const useCreateSegment = () => {
  const [createMutation] = useMutation(createSegment);
  const { toast } = useToast();
  const { t } = useTranslation();

  const createSegmentAsync = useCallback(
    async (
      formValues: CreateSegmentFormValues,
      environmentId: string | undefined,
    ): Promise<boolean> => {
      try {
        const data = {
          ...formValues,
          bizType: 'USER',
          data: [],
          environmentId,
        };
        const ret = await createMutation({ variables: { data } });

        if (!ret.data?.createSegment?.id) {
          toast({
            variant: 'destructive',
            title: t('users.toast.segments.createFailed'),
          });
          return false;
        }

        toast({
          variant: 'success',
          title: t('users.toast.segments.segmentCreated', { segmentName: formValues.name }),
        });

        return true;
      } catch (error) {
        toast({
          variant: 'destructive',
          title: getErrorMessage(error),
        });
        return false;
      }
    },
    [createMutation, toast],
  );

  return {
    createSegmentAsync,
  };
};
