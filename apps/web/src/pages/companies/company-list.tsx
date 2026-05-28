import { useAppContext } from '@/contexts/app-context';
import { useCurrentSegment } from '@/hooks/use-current-segment';
import { filterSegmentsByTypeOrder } from '@/utils/segment';
import { useSegmentListQuery } from '@usertour/hooks';
import { ScrollArea } from '@usertour/ui';
import { useMemo } from 'react';
import { CompanyListContent } from './components/company-list-content';
import { CompanyListSidebar } from './components/company-list-sidebar';

const COMPANY_BIZ_TYPE = ['COMPANY'];

export const CompanyList = () => {
  const { environment } = useAppContext();
  const envId = environment?.id;

  // Single source of truth — see user-list.tsx for the rationale.
  const {
    segmentList: rawSegmentList,
    loading: segmentsLoading,
    refetch: refetchSegments,
    networkStatus: segmentsNetworkStatus,
  } = useSegmentListQuery(envId ?? '', COMPANY_BIZ_TYPE, {
    skip: !envId,
    notifyOnNetworkStatusChange: true,
  });
  // See user-list.tsx — ALL pinned to top, then CONDITION, then MANUAL.
  const segmentList = useMemo(
    () => filterSegmentsByTypeOrder(rawSegmentList, COMPANY_BIZ_TYPE),
    [rawSegmentList],
  );
  const currentSegment = useCurrentSegment(segmentList);

  if (!envId) {
    return null;
  }

  return (
    <>
      <CompanyListSidebar
        environmentId={envId}
        segmentList={segmentList}
        currentSegment={currentSegment}
        loading={segmentsLoading}
        refetchSegments={refetchSegments}
      />
      <ScrollArea className="h-full w-full ">
        <CompanyListContent
          environmentId={envId}
          currentSegment={currentSegment}
          refetchSegments={refetchSegments}
          segmentsIsRefetching={segmentsNetworkStatus === 4}
        />
      </ScrollArea>
    </>
  );
};

CompanyList.displayName = 'CompanyList';
