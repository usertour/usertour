import { Skeleton } from '@usertour-packages/skeleton';
import { Separator } from '@usertour-packages/separator';
import { ListSkeleton } from '@/components/molecules/skeleton';

// Skeleton for the header section
export const SegmentHeaderSkeleton = () => {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1 flex flex-row items-center relative">
        {/* Segment name skeleton */}
        <Skeleton className="h-6 w-32" />

        {/* Edit button skeleton */}
        <Skeleton className="h-8 w-8 ml-2" />

        {/* Filter save button skeleton */}
        <Skeleton className="h-8 w-20 ml-2" />
      </div>

      {/* Actions dropdown skeleton */}
      <Skeleton className="h-8 w-8" />
    </div>
  );
};

// Main skeleton for segment content
export const SegmentContentSkeleton = () => {
  return (
    <div className="flex flex-col flex-shrink min-w-0 px-4 py-6 lg:px-8 grow">
      {/* Header skeleton */}
      <SegmentHeaderSkeleton />

      {/* Separator */}
      <Separator className="my-4" />

      {/* Data table skeleton */}
      <ListSkeleton />
    </div>
  );
};
