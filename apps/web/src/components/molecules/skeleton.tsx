import { Skeleton } from '@usertour-ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';

export const ListSkeleton = () => {
  return (
    <div className="rounded-md border-none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton className="h-4 w-36" />
            </TableHead>
            <TableHead>
              <div className="flex items-center space-x-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-24" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-8" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-36" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-8 rounded" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
    <div className="flex flex-wrap gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="h-52 w-80 bg-white rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-gray-900"
        >
          {/* Header skeleton - matches ThemeListPreview header */}
          <div className="bg-slate-50 dark:bg-gray-800 rounded-t-md py-2.5 px-5 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-row grow space-x-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-4 rounded" />
          </div>

          {/* Content skeleton - matches ThemeListPreview content area */}
          <div className="flex justify-center items-center h-40 flex-col p-4">
            <Skeleton className="h-32 w-64 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};
