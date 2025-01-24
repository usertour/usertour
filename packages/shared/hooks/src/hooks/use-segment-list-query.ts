import { useQuery } from "@apollo/client";
import { listSegment } from "@usertour-ui/gql";
import { Segment } from "@usertour-ui/types";

export const useSegmentListQuery = (
  environmentId: string,
  bizType: string[] = ["COMPANY", "USER"]
) => {
  const { data, refetch, loading, error } = useQuery(listSegment, {
    variables: { environmentId },
  });
  const segments =
    data && data.listSegment && data.listSegment.length > 0
      ? data.listSegment.filter((item: Segment) =>
          bizType.includes(item.bizType)
        )
      : [];

  return { segmentList: segments as Segment[], refetch, loading, error };
};
