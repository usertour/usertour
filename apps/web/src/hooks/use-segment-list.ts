import { useListSegmentsQuery } from '@usertour/hooks';
import type { Segment } from '@usertour/types';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { filterSegmentsByTypeOrder } from '@/utils/segment';

// Replaces `SegmentListContext`. The Provider hosted two unrelated
// concerns:
// * data — `listSegment` query + bizType filter
// * URL state — `currentSegment` derived from `?segment_id=…`
//   and dead `currentConditions` useState that was never read outside
//   the Context after D0 moved the entity-list typed-filter state to a
//   reactive var (`entity-list-state.ts`).
//
// The hook keeps the live two: filtered segmentList + currentSegment
// derivation. `currentConditions` is dropped — D0's reactive var
// (`entity-list-state.ts::currentConditionsVar`) is the live source.
export const useSegmentList = (environmentId: string | undefined, bizType: readonly string[]) => {
  const result = useListSegmentsQuery(environmentId, SHARED_CACHE_QUERY_OPTIONS);
  const [searchParams] = useSearchParams();

  const segmentList = useMemo(() => {
    if (result.segmentList && result.segmentList.length > 0) {
      return filterSegmentsByTypeOrder(result.segmentList, [...bizType]);
    }
    return undefined;
  }, [result.segmentList, bizType]);

  const currentSegment = useMemo(() => {
    if (!segmentList?.length) {
      return undefined;
    }
    const segmentId = searchParams.get('segment_id');
    return segmentList.find((seg: Segment) => {
      return segmentId
        ? seg.id === segmentId
        : bizType.includes(seg.bizType) && seg.dataType === 'ALL';
    });
  }, [searchParams, segmentList, bizType]);

  return {
    segmentList,
    currentSegment,
    refetch: result.refetch,
    loading: result.loading,
    isRefetching: result.isRefetching,
  };
};
