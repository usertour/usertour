import { Skeleton } from '@usertour/ui';
import { cn } from '@usertour/tailwind';

export interface ContentListSkeletonProps {
  count: number;
}

// Skeleton mirror of the content list card (DataTable): a solid card (soft
// shadow in light, raised-surface block in dark) with the preview canvas on
// top and the footer strip below. The grid track matches DataTable's
// `minmax(280px, 1fr)` so column count doesn't change when data lands. Lives
// next to the list page because it encodes the specific card shape.
export const ContentListSkeleton = (props: ContentListSkeletonProps) => {
  const { count } = props;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={cn(
            'flex h-72 flex-col overflow-hidden rounded-xl bg-card dark:bg-surface-raised',
            'shadow-[0_1px_2px_rgba(16,24,40,0.04),0_2px_8px_rgba(16,24,40,0.06)] dark:shadow-none',
          )}
        >
          {/* Preview canvas */}
          <Skeleton className="min-h-0 flex-1 rounded-none" />
          {/* Footer strip — name + status, then updated time */}
          <div className="flex flex-none flex-col gap-2 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
};

ContentListSkeleton.displayName = 'ContentListSkeleton';
