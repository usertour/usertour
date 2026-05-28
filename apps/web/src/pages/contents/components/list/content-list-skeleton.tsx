import { Skeleton } from '@usertour/ui';

export interface ContentListSkeletonProps {
  count: number;
}

// Skeleton mirror of the Content list card grid. Breakpoints match the
// DataTable card layout (grid-cols-1 → 6 across the responsive ladder).
// Lives next to the list page rather than in @usertour/ui because it
// encodes the specific card shape only this page renders.
export const ContentListSkeleton = (props: ContentListSkeletonProps) => {
  const { count } = props;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-6 gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col space-y-3 h-64 min-w-72">
          <Skeleton className="grow rounded-xl" />
          <div className="space-y-2 flex-none">
            <Skeleton className="h-4 " />
            <Skeleton className="h-4 w-10/12	" />
          </div>
        </div>
      ))}
    </div>
  );
};

ContentListSkeleton.displayName = 'ContentListSkeleton';
