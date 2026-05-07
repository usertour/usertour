import { Skeleton } from '@usertour-packages/skeleton';

// Loading skeleton for ContentDetailHeader. Matches the same h-14 + breadcrumb
// (left) + tabs + status + actions (right) shape so the loading state
// doesn't jump when the real header renders. The h-14 also matches
// SectionBreadcrumbHeader (used by user / company / session detail) so all
// sidebar-inner detail headers stay at the same height.
export const ContentDetailHeaderSkeleton = () => {
  return (
    <div className="sticky top-0 z-10 border-b border-border/50 bg-background">
      <div className="flex h-14 w-full items-center gap-4 px-4">
        {/* Left: breadcrumb */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-5 w-40" />
        </div>
        {/* Tabs */}
        <div className="ml-2 flex items-center gap-4 lg:gap-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
};
