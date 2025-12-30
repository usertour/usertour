import { useMutation } from '@apollo/client';
import { createBizUserOnSegment } from '@usertour-packages/gql';
import { useUserListContext } from '@/contexts/user-list-context';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export const useAddUsersToSegment = () => {
  const [createMutation] = useMutation(createBizUserOnSegment);
  const { refetch } = useUserListContext();
  const { toast } = useToast();
  const { t } = useTranslation();

  const addUsers = useCallback(
    async (userIds: string[], segmentId: string, segmentName: string): Promise<boolean> => {
      if (userIds.length === 0) {
        return false;
      }

      const userOnSegment = userIds.map((userId) => ({
        bizUserId: userId,
        segmentId,
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
              segmentName,
            }),
          });
          refetch();
          return true;
        }
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
  };
};
