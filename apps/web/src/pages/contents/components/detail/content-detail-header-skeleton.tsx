import { Skeleton } from '@usertour-ui/skeleton';

// Skeleton for the main navigation tabs
export const ContentDetailHeaderNavSkeleton = () => {
  return (
    <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-4 w-16" />
      ))}
    </nav>
  );
};

// Main skeleton for ContentDetailHeader
export const ContentDetailHeaderSkeleton = () => {
  return (
    <div className="border-b bg-white flex-col md:flex w-full fixed z-10 top-0">
      <div className="flex h-16 items-center px-4">
        {/* Back arrow skeleton */}
        <Skeleton className="h-6 w-8 ml-4" />

        {/* Content name skeleton */}
        <Skeleton className="h-5 w-40 ml-4" />

        {/* Edit button skeleton */}
        <Skeleton className="h-8 w-8 ml-2" />

        {/* Navigation tabs skeleton */}
        <ContentDetailHeaderNavSkeleton />

        {/* Right side actions skeleton */}
        <div className="ml-auto flex items-center space-x-4">
          {/* Autosave/Published text skeleton */}
          <div className="px-1 text-sm text-muted-foreground min-w-60 text-right">
            <Skeleton className="h-4 w-48" />
          </div>

          {/* Edit In Builder button skeleton */}
          <Skeleton className="h-9 w-32" />

          {/* Publish button skeleton */}
          <Skeleton className="h-9 w-20" />

          {/* Actions dropdown skeleton */}
          <Skeleton className="h-9 w-9 rounded" />
        </div>
      </div>
    </div>
  );
};
