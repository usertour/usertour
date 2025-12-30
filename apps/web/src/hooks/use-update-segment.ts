import { useMutation } from '@apollo/client';
import { updateSegment } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { EditSegmentFormValues } from '@/pages/users/types/segment-form-schema';
import { useTranslation } from 'react-i18next';

export const useUpdateSegment = () => {
  const [updateMutation] = useMutation(updateSegment);
  const { toast } = useToast();
  const { t } = useTranslation();

  const updateSegmentAsync = useCallback(
    async (segmentId: string, formValues: EditSegmentFormValues): Promise<boolean> => {
      try {
        const data = {
          id: segmentId,
          name: formValues.name,
        };
        const response = await updateMutation({ variables: { data } });

        if (!response.data?.updateSegment?.id) {
          toast({
            variant: 'destructive',
            title: t('users.toast.segments.updateFailed'),
          });
          return false;
        }

        toast({
          variant: 'success',
          title: t('users.toast.segments.segmentUpdated', { segmentName: formValues.name }),
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
    [updateMutation, toast],
  );

  return {
    updateSegmentAsync,
  };
};
