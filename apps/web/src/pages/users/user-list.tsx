import { useAppContext } from '@/contexts/app-context';
import { useCurrentSegment } from '@/hooks/use-current-segment';
import { filterSegmentsByTypeOrder } from '@/utils/segment';
import { useSegmentListQuery } from '@usertour/hooks';
import { ScrollArea } from '@usertour/ui';
import { useMemo } from 'react';
import { UserListContent } from './components/user-list-content';
import { UserListSidebar } from './components/user-list-sidebar';

const USER_BIZ_TYPE = ['USER'];

export const UserList = () => {
  const { environment } = useAppContext();
  const envId = environment?.id;

  // Single source of truth for the page's segment list. Sidebar + content
  // both read from this — two parallel `useSegmentListQuery` calls were
  // causing the right-pane to miss freshly created segments on click,
  // because Apollo's notification didn't always propagate to both
  // subscribers in the same commit.
  const {
    segmentList: rawSegmentList,
    loading: segmentsLoading,
    refetch: refetchSegments,
    networkStatus: segmentsNetworkStatus,
  } = useSegmentListQuery(envId ?? '', USER_BIZ_TYPE, {
    skip: !envId,
    notifyOnNetworkStatusChange: true,
  });
  // Group segments as ALL → CONDITION → MANUAL so the system "All Users"
  // entry stays pinned at the top of the sidebar.
  const segmentList = useMemo(
    () => filterSegmentsByTypeOrder(rawSegmentList, USER_BIZ_TYPE),
    [rawSegmentList],
  );
  const currentSegment = useCurrentSegment(segmentList);

  if (!envId) {
    return null;
  }

  return (
    <>
      <UserListSidebar
        environmentId={envId}
        segmentList={segmentList}
        currentSegment={currentSegment}
        loading={segmentsLoading}
        refetchSegments={refetchSegments}
      />
      <ScrollArea className="h-full w-full ">
        <UserListContent
          environmentId={envId}
          currentSegment={currentSegment}
          refetchSegments={refetchSegments}
          segmentsIsRefetching={segmentsNetworkStatus === 4}
        />
      </ScrollArea>
    </>
  );
};

UserList.displayName = 'UserList';
