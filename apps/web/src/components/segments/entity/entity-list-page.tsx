import { NetworkStatus } from '@apollo/client';
import { useAppContext } from '@/contexts/app-context';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useCurrentSegment } from '@/hooks/use-current-segment';
import { filterSegmentsByTypeOrder } from '@/utils/segment';
import { useSegmentListQuery } from '@usertour/hooks';
import { ScrollArea } from '@usertour/ui';
import { useMemo } from 'react';
import { EntityListContent } from './entity-list-content';
import { EntityListSidebar } from './entity-list-sidebar';
import type { EntityConfig } from './entity-config';

interface EntityRow {
  id: string;
  environmentId: string;
}

interface EntityListPageProps<TRow extends EntityRow> {
  config: EntityConfig<TRow>;
}

export function EntityListPage<TRow extends EntityRow>({ config }: EntityListPageProps<TRow>) {
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
  } = useSegmentListQuery(envId ?? '', config.segmentBizType, {
    ...SHARED_CACHE_QUERY_OPTIONS,
    skip: !envId,
    notifyOnNetworkStatusChange: true,
  });
  // Group as ALL → CONDITION → MANUAL so the system segment pins to the top.
  const segmentList = useMemo(
    () => filterSegmentsByTypeOrder(rawSegmentList, config.segmentBizType),
    [rawSegmentList, config.segmentBizType],
  );
  const currentSegment = useCurrentSegment(segmentList);

  if (!envId) {
    return null;
  }

  return (
    <>
      <EntityListSidebar
        config={config}
        environmentId={envId}
        segmentList={segmentList}
        currentSegment={currentSegment}
        loading={segmentsLoading}
        refetchSegments={refetchSegments}
      />
      <ScrollArea className="h-full w-full ">
        <EntityListContent
          config={config}
          environmentId={envId}
          currentSegment={currentSegment}
          refetchSegments={refetchSegments}
          segmentsIsRefetching={segmentsNetworkStatus === NetworkStatus.refetch}
        />
      </ScrollArea>
    </>
  );
}

EntityListPage.displayName = 'EntityListPage';
