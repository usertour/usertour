import { useMutation } from '@apollo/client';
import { createBizUserOnSegment } from '@usertour-packages/gql';
import { useUserListContext } from '@/contexts/user-list-context';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Segment } from '@usertour/types';

/**
 * Hook to handle adding users to manual segments
 * @returns Object containing the add function and loading state
 */
export const useAddUsersToSegment = () => {
  const [createMutation, { loading }] = useMutation(createBizUserOnSegment);
  const { refetch } = useUserListContext();
  const { toast } = useToast();
  const { t } = useTranslation();

  const addUsers = useCallback(
    async (userIds: string[], segment: Segment): Promise<boolean> => {
      // Validate inputs
      if (!userIds || userIds.length === 0) {
        toast({
          variant: 'destructive',
          title: t('users.toast.segments.noUsersSelected'),
        });
        return false;
      }

      if (!segment?.id || !segment?.name) {
        toast({
          variant: 'destructive',
          title: t('users.toast.segments.invalidSegment'),
        });
        return false;
      }

      // Transform data for GraphQL mutation
      const userOnSegment = userIds.map((userId) => ({
        bizUserId: userId,
        segmentId: segment.id,
        data: {},
      }));

      const data = {
        userOnSegment,
      };

      try {
        const ret = await createMutation({ variables: { data } });

        if (ret.data?.createBizUserOnSegment?.success) {
          toast({
            variant: 'success',
            title: t('users.toast.segments.usersAdded', {
              count: ret.data.createBizUserOnSegment.count,
              segmentName: segment.name,
            }),
          });
          refetch();
          return true;
        }

        // Handle unexpected response
        toast({
          variant: 'destructive',
          title: t('users.toast.segments.addFailed'),
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
    addUsers,
    isAdding: loading,
  };
};
