import { useMutation } from '@apollo/client';
import { createBizUserOnSegment } from '@usertour/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/ui';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Segment } from '@usertour/types';

/**
 * Adds users to manual segments. Owns the mutation + toast triage;
 * **does not** auto-refetch the user list — caller passes the list's
 * `refetch` (from `useBizListCursor`) and invokes it on success.
 */
export const useAddUsersToSegment = () => {
  const [createMutation, { loading }] = useMutation(createBizUserOnSegment);
  const { toast } = useToast();
  const { t } = useTranslation();

  const addUsers = useCallback(
    async (userIds: string[], segment: Segment): Promise<boolean> => {
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

      const userOnSegment = userIds.map((userId) => ({
        bizUserId: userId,
        segmentId: segment.id,
        data: {},
      }));

      try {
        const ret = await createMutation({ variables: { data: { userOnSegment } } });

        if (ret.data?.createBizUserOnSegment?.success) {
          toast({
            variant: 'success',
            title: t('users.toast.segments.usersAdded', {
              count: ret.data.createBizUserOnSegment.count,
              segmentName: segment.name,
            }),
          });
          return true;
        }

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
    [createMutation, toast, t],
  );

  return {
    addUsers,
    isAdding: loading,
  };
};
