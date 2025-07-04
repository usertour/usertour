import { Skeleton } from '@usertour-ui/skeleton';

// Skeleton for individual step/item in content detail
export const ContentDetailItemSkeleton = () => {
  return (
    <div className="flex flex-row p-4 px-8 shadow bg-white rounded-lg space-x-8">
      {/* Preview area skeleton */}
      <div className="w-40 h-32 flex flex-none items-center justify-center">
        <Skeleton className="h-24 w-32 rounded-lg" />
      </div>

      {/* Content info skeleton */}
      <div className="grow flex flex-col relative space-y-1 min-w-80">
        {/* Edit button skeleton */}
        <div className="flex flex-row space-x-1 items-center right-0 top-0 absolute">
          <Skeleton className="h-8 w-8 rounded" />
        </div>

        {/* Title skeleton */}
        <div className="font-bold flex flex-row space-x-1 items-center">
          <Skeleton className="h-5 w-32" />
        </div>

        {/* Badges skeleton */}
        <div className="text-sm space-x-1">
          <Skeleton className="h-5 w-16 inline-block mr-1" />
          <Skeleton className="h-5 w-20 inline-block mr-1" />
          <Skeleton className="h-5 w-24 inline-block mr-1" />
          <Skeleton className="h-5 w-20 inline-block" />
        </div>

        {/* Additional badges skeleton */}
        <div className="flex flex-row space-x-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-28" />
        </div>

        {/* Last edited timestamp skeleton */}
        <div className="text-xs absolute right-0 bottom-0 text-muted-foreground">
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
};

// Skeleton for add button (for flows)
export const ContentDetailAddButtonSkeleton = () => {
  return (
    <div className="flex py-8 shadow bg-white rounded-lg justify-center cursor-pointer w-auto h-auto">
      <Skeleton className="h-10 w-10 rounded" />
    </div>
  );
};

// Skeleton for settings rules section
export const ContentDetailSettingsRuleSkeleton = () => {
  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Toggle switch */}
      <div className="flex items-center space-x-2">
        <Skeleton className="h-6 w-11 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Rules content */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Add rule button */}
      <Skeleton className="h-9 w-24 rounded" />
    </div>
  );
};

// Main skeleton for ContentDetailSettings
export const ContentDetailSettingsSkeleton = () => {
  return (
    <div className="flex flex-col space-y-6 flex-none w-[420px]">
      {/* Auto-start rules skeleton */}
      <ContentDetailSettingsRuleSkeleton />

      {/* Hide rules skeleton */}
      <ContentDetailSettingsRuleSkeleton />
    </div>
  );
};

// Main skeleton for ContentDetailContent
export const ContentDetailContentSkeleton = () => {
  return (
    <div className="flex flex-col space-y-6 grow">
      {/* Show multiple skeleton items to represent content */}
      {Array.from({ length: 3 }, (_, index) => (
        <ContentDetailItemSkeleton key={index} />
      ))}

      {/* Add button skeleton (for flows) */}
      <ContentDetailAddButtonSkeleton />
    </div>
  );
};
