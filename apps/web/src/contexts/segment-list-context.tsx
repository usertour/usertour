import { useQuery } from '@apollo/client';
import { listSegment } from '@usertour-ui/gql';
import { RulesCondition, Segment } from '@usertour-ui/types';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface SegmentListProviderProps {
  children?: ReactNode;
  environmentId: string | undefined;
  bizType: string[];
}

export type CurrentConditions = {
  segmentId: string;
  data: RulesCondition[];
};

export interface SegmentListContextValue {
  segmentList: Segment[] | undefined;
  refetch: any;
  environmentId: string | undefined;
  currentSegment: Segment | undefined;
  currentConditions: CurrentConditions | undefined;
  setCurrentConditions: React.Dispatch<React.SetStateAction<CurrentConditions | undefined>>;
  loading: boolean;
}
export const SegmentListContext = createContext<SegmentListContextValue | undefined>(undefined);

export function SegmentListProvider(props: SegmentListProviderProps): JSX.Element {
  const { children, environmentId, bizType } = props;
  const { data, refetch, loading } = useQuery(listSegment, {
    variables: { environmentId },
    skip: !environmentId,
  });
  const [searchParams, _] = useSearchParams();
  const [currentSegment, setCurrentSegment] = useState<Segment>();
  const [currentConditions, setCurrentConditions] = useState<CurrentConditions | undefined>();
  const [segmentList, setSegmentList] = useState<Segment[] | undefined>();

  useEffect(() => {
    if (data?.listSegment && data.listSegment.length > 0) {
      setSegmentList(data.listSegment.filter((item: Segment) => bizType.includes(item.bizType)));
    }
  }, [data?.listSegment]);

  useEffect(() => {
    if (segmentList && segmentList.length > 0) {
      const segmentId = searchParams.get('segment_id');
      const segment = segmentList.find((seg: Segment) => {
        return segmentId
          ? seg.id === segmentId
          : bizType.includes(seg.bizType) && seg.dataType === 'ALL';
      });
      if (segment) {
        setCurrentSegment(segment);
        if (segment.id !== currentConditions?.segmentId) {
          setCurrentConditions(undefined);
        }
      }
    }
  }, [searchParams, segmentList, bizType, currentConditions]);

  const value: SegmentListContextValue = {
    segmentList,
    refetch,
    currentSegment,
    environmentId,
    currentConditions,
    setCurrentConditions,
    loading,
  };

  return <SegmentListContext.Provider value={value}>{children}</SegmentListContext.Provider>;
}

export function useSegmentListContext(): SegmentListContextValue {
  const context = useContext(SegmentListContext);
  if (!context) {
    throw new Error('useSegmentListContext must be used within a SegmentListProvider.');
  }
  return context;
}
