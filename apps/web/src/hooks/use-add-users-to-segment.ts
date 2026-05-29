import { useCreateBizUserOnSegmentMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/ui';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Segment } from '@usertour/types';

/**
 * Adds users to manual segments. Owns the toast triage; the wrapper
 * `useCreateBizUserOnSegmentMutation` handles cache refresh via its
 * built-in `refetchQueries: ['queryBizUser']`.
 */
export const useAddUsersToSegment = () => {
  const { invoke: createMutation, loading } = useCreateBizUserOnSegmentMutation();
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
        const ret = await createMutation({ data: { userOnSegment } });

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
