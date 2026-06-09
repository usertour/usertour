import type { ReactNode } from 'react';
import { Skeleton } from '../../primitives/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../primitives/table';
import { ResourceTable, type ResourceTableColumn } from './resource-table';

const DEFAULT_SKELETON_ROWS = 5;

export interface ResourceListBodyProps<T> {
  columns: readonly ResourceTableColumn<T>[];
  rows: readonly T[] | undefined;
  getRowKey: (item: T) => string;
  loading?: boolean;
  /** Custom skeleton during load. Defaults to a placeholder table. */
  skeleton?: ReactNode;
  /** Empty-state cell content. Pass a translated string — no English default. */
  empty?: ReactNode;
  onRowClick?: (item: T) => void;
}

/**
 * Table portion of a list page — handles skeleton and empty state but
 * draws no page chrome. `ResourceListPage` composes this with
 * `SettingsPage`; pages that already drew their own header (e.g.
 * attributes inside tabs) render this directly.
 */
export function ResourceListBody<T>(props: ResourceListBodyProps<T>) {
  const { columns, rows, getRowKey, loading, skeleton, empty, onRowClick } = props;
  if (loading) {
    return <>{skeleton ?? <DefaultSkeleton columns={columns} />}</>;
  }
  return (
    <ResourceTable<T>
      columns={columns}
      rows={rows ?? []}
      getRowKey={getRowKey}
      onRowClick={onRowClick}
      empty={empty}
    />
  );
}

ResourceListBody.displayName = 'ResourceListBody';

interface DefaultSkeletonProps<T> {
  columns: readonly ResourceTableColumn<T>[];
}

const DefaultSkeleton = <T,>(props: DefaultSkeletonProps<T>) => {
  const { columns } = props;
  return (
    <div className="overflow-x-auto">
      <Table className="table-fixed min-w-2xl">
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index} className={column.headerClassName}>
                <Skeleton className="h-4 w-32" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: DEFAULT_SKELETON_ROWS }, (_, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((_column, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
