import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour/table';
import { cn } from '@usertour/tailwind';

export interface ResourceTableColumn<T> {
  header: ReactNode;
  cell: (item: T) => ReactNode;
  className?: string;
  /** Applied to the matching `<th>` (e.g. width or `hidden sm:table-cell`). */
  headerClassName?: string;
}

export interface ResourceTableProps<T> {
  columns: readonly ResourceTableColumn<T>[];
  rows: readonly T[];
  getRowKey: (item: T) => string;
  /**
   * Optional per-row click handler. When set, every row gets `cursor-pointer`
   * and the handler fires on row click.
   */
  onRowClick?: (item: T) => void;
  /**
   * Rendered when `rows` is empty. Defaults to a single centred
   * "No results." cell spanning every column.
   */
  empty?: ReactNode;
  className?: string;
}

/**
 * Thin generic wrapper around the shared `Table` primitive — encodes the
 * `overflow-x-auto + table-fixed min-w-2xl` shell used by every Settings
 * list page and folds the "empty state row" boilerplate.
 */
export function ResourceTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  empty,
  className,
}: ResourceTableProps<T>) {
  const isEmpty = rows.length === 0;

  return (
    <div className={cn('overflow-x-auto', className)}>
      <Table className="table-fixed min-w-2xl">
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index} className={column.headerClassName}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isEmpty ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                {empty ?? 'No results.'}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((item) => (
              <TableRow
                key={getRowKey(item)}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : undefined}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {columns.map((column, index) => (
                  <TableCell key={index} className={column.className}>
                    {column.cell(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

ResourceTable.displayName = 'ResourceTable';
