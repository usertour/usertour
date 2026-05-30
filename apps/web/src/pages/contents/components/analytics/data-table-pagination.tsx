import type { Table } from '@tanstack/react-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@usertour/ui';
import { CursorPaginationControls } from '@/components/cursor-pagination-controls';

export interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  totalCount: number;
  /** Disable nav buttons + Rows-per-page Select while a cursor
   *  request is in flight. Pass `loading || isRefetching` from
   *  `useCursorPagination`. See `CursorPaginationControls` for the
   *  race this gate prevents. */
  busy?: boolean;
}

export function DataTablePagination<TData>(props: DataTablePaginationProps<TData>) {
  const { table, totalCount, busy = false } = props;
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">{totalCount} sessions in total.</div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
            disabled={busy}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CursorPaginationControls table={table} busy={busy} />
      </div>
    </div>
  );
}
