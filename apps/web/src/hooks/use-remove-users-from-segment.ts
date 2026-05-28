import { useDeleteBizUserOnSegmentMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface RemoveUsersResult {
  success: boolean;
  count?: number;
  error?: string;
}

// Mirror of `useRemoveCompaniesFromSegment` — caller owns refetch on
// success. The previous implementation read `useUserListContext()` here
// to auto-refetch, which made `BulkRemoveFromSegmentDialog` crash on the
// companies page (the shared dialog calls both hooks and the companies
// tree has no UserListProvider).
export const useRemoveUsersFromSegment = () => {
  const { invoke: deleteBizUserOnSegment, loading } = useDeleteBizUserOnSegmentMutation();
  const { t } = useTranslation();

  const removeUsers = useCallback(
    async (userIds: string[], segmentId: string): Promise<RemoveUsersResult> => {
      if (userIds.length === 0) {
        return { success: false, error: t('users.toast.segments.noUsersSelected') };
      }

      const data = {
        bizUserIds: userIds,
        segmentId,
      };

      try {
        const ret = await deleteBizUserOnSegment(data);
        if (ret.success) {
          return { success: true, count: ret.count };
        }
        return { success: false, error: t('users.toast.segments.removeFailed') };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },
    [deleteBizUserOnSegment, t],
  );

  return {
    removeUsers,
    loading,
  };
};
