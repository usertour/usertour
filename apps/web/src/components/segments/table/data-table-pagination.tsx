import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@usertour/ui';
import { CursorPaginationControls } from '@/components/cursor-pagination-controls';
import { DataTablePaginationProps } from './types';

export function DataTablePagination<TData extends { id: string }>(
  props: DataTablePaginationProps<TData>,
) {
  const { table, busy = false } = props;
  return (
    <div className="flex items-center justify-between px-2">
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
            {[20, 50, 100].map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <CursorPaginationControls table={table} busy={busy} />
      </div>
    </div>
  );
}
