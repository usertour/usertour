import { useMutation } from '@apollo/client';
import { createSegment } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { CreateSegmentFormValues } from '@/pages/users/types/segment-form-schema';

export const useCreateSegment = () => {
  const [createMutation] = useMutation(createSegment);
  const { toast } = useToast();

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
            title: 'Create Segment failed.',
          });
          return false;
        }

        toast({
          variant: 'success',
          title: `Segment "${formValues.name}" has been created successfully`,
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
