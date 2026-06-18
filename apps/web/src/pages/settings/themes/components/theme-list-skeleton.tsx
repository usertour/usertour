import { Skeleton } from '@usertour/ui';
import { cn } from '@usertour/tailwind';

export interface ThemeListSkeletonProps {
  count: number;
}

// Skeleton mirror of ThemeCardPreview: solid card (soft shadow in light,
// raised-surface block in dark) with the name-on-top header strip and the
// preview canvas below. Lives next to the Themes list page rather than in
// @usertour/ui because it shadows a specific business component — moving it
// here keeps the visual twin discoverable when ThemeCardPreview is edited.
export const ThemeListSkeleton = (props: ThemeListSkeletonProps) => {
  const { count } = props;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={cn(
            'flex h-52 flex-col overflow-hidden rounded-xl bg-card dark:bg-surface-raised',
            'shadow-[0_1px_2px_rgba(16,24,40,0.04),0_2px_8px_rgba(16,24,40,0.06)] dark:shadow-none',
          )}
        >
          {/* Header strip — name + default pill + actions */}
          <div className="flex flex-none items-center justify-between gap-2 px-4 py-3 dark:border-b dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="size-5 rounded" />
          </div>
          {/* Preview canvas */}
          <Skeleton className="min-h-0 flex-1 rounded-none" />
        </div>
      ))}
    </div>
  );
};

ThemeListSkeleton.displayName = 'ThemeListSkeleton';
