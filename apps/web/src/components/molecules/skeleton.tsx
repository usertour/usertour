import { Skeleton } from '@usertour-ui/skeleton';

export const ListSkeleton = () => {
  return (
    <div className="flex flex-col space-y-2 ">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-10/12" />
      <Skeleton className="h-6 w-8/12" />
      <Skeleton className="h-6 w-5/12" />
      <Skeleton className="h-6 w-11/12" />
      <Skeleton className="h-6 w-full" />
    </div>
  );
};

ListSkeleton.displayName = 'ListSkeleton';

export const AdminSkeleton = () => {
  return (
    <div className="flex flex-col space-y-8 w-full p-4 ">
      <div className="w-full flex flex-row space-x-2">
        <Skeleton className="h-16 flex-grow" />
      </div>
      <div className="w-full flex flex-row">
        <div className="pb-12 flex-none w-72 pt-2 mr-8 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grow pt-2 space-y-2">
          <Skeleton className="h-40 w-full " />
          <Skeleton className="h-10 w-8/12" />
          <Skeleton className="h-10 w-5/12" />
          <Skeleton className="h-10 w-11/12" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-8/12" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-5/12" />
          <Skeleton className="h-10 w-11/12" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-8/12" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-5/12" />
          <Skeleton className="h-10 w-11/12" />
        </div>
      </div>
    </div>
  );
};

interface ListSkeletonCountProps {
  count: number;
}

export const ListSkeletonCount: React.FC<ListSkeletonCountProps> = ({ count }) => {
  const widthClasses = ['w-full', 'w-10/12', 'w-8/12', 'w-5/12', 'w-11/12'];

  return (
    <div className="flex flex-col space-y-2">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={`h-10 ${widthClasses[index % widthClasses.length]}`} />
      ))}
    </div>
  );
};

export const ContentListSkeleton = ({ count }: ListSkeletonCountProps) => {
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

export const ThemeListSkeleton = ({ count }: ListSkeletonCountProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-6 gap-4 min-w-[800px]">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col space-y-3 h-48 min-w-80">
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
