import { Skeleton } from '@usertour/ui';

export interface ThemeListSkeletonProps {
  count: number;
}

// Skeleton mirror of ThemeCardPreview's layout (header band + content area).
// Lives next to the Themes list page rather than in @usertour/ui because it
// shadows a specific business component — moving it here keeps the visual
// twin discoverable when ThemeCardPreview is edited.
export const ThemeListSkeleton = (props: ThemeListSkeletonProps) => {
  const { count } = props;
  return (
    <div className="flex flex-wrap gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-52 w-80 bg-card rounded-lg border border-border">
          {/* Header band — matches ThemeCardPreview header */}
          <div className="bg-surface dark:bg-muted rounded-t-md py-2.5 px-5 flex justify-between items-center border-b border-border">
            <div className="flex flex-row grow space-x-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          {/* Content area — matches ThemeCardPreview body */}
          <div className="flex justify-center items-center h-40 flex-col p-4">
            <Skeleton className="h-32 w-64 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

ThemeListSkeleton.displayName = 'ThemeListSkeleton';
