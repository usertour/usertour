import { Skeleton } from '../primitives/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../primitives/table';

export const ListSkeleton = ({ length = 5 }: { length?: number }) => {
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
          {Array.from({ length }, (_, index) => (
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

export interface ListSkeletonCountProps {
  count: number;
}

export const ListSkeletonCount = (props: ListSkeletonCountProps) => {
  const { count } = props;
  const widthClasses = ['w-full', 'w-10/12', 'w-8/12', 'w-5/12', 'w-11/12'];

  return (
    <div className="flex flex-col space-y-2">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={`h-10 ${widthClasses[index % widthClasses.length]}`} />
      ))}
    </div>
  );
};
