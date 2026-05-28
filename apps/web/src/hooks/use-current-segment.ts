import type { Segment } from '@usertour/types';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

// Derive the active segment from the URL `segment_id` search param +
// the loaded segment list. Replaces the `currentSegment` state machine
// that lived in the pre-D0 `SegmentListContext` — the URL is the
// canonical source, so multiple components on the same page derive
// the same value without needing to coordinate.
export const useCurrentSegment = (segmentList: Segment[] | undefined): Segment | undefined => {
  const [searchParams] = useSearchParams();
  return useMemo(() => {
    if (!segmentList || segmentList.length === 0) return undefined;
    const segmentId = searchParams.get('segment_id');
    return segmentList.find((seg) => (segmentId ? seg.id === segmentId : seg.dataType === 'ALL'));
  }, [searchParams, segmentList]);
};
