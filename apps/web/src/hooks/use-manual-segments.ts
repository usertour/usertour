import { useMemo } from 'react';
import { useSegmentListContext } from '@/contexts/segment-list-context';

/**
 * Hook to filter and provide manual segments from the segment list
 * @returns Object containing filtered manual segments
 */
export const useManualSegments = () => {
  const { segmentList } = useSegmentListContext();

  const manualSegments = useMemo(() => {
    // Validate segmentList exists and is an array before filtering
    if (!segmentList || !Array.isArray(segmentList)) {
      return [];
    }

    return segmentList.filter((segment) => {
      // Validate segment exists and has dataType property
      return segment?.dataType === 'MANUAL';
    });
  }, [segmentList]);

  return {
    manualSegments,
  };
};
