import { useMutation } from '@apollo/client';
import { updateSegment } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { EditSegmentFormValues } from '@/pages/users/types/segment-form-schema';

export const useUpdateSegment = () => {
  const [updateMutation] = useMutation(updateSegment);
  const { toast } = useToast();

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
            title: 'Update Segment failed.',
          });
          return false;
        }

        toast({
          variant: 'success',
          title: `Segment has been updated to "${formValues.name}"`,
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
