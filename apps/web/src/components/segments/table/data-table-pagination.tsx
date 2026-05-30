import { CursorPaginationControls } from '@/components/cursor-pagination-controls';
import { DataTablePaginationProps } from './types';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export function DataTablePagination<TData extends { id: string }>(
  props: DataTablePaginationProps<TData>,
) {
  const { table, busy = false } = props;
  return (
    <div className="flex items-center justify-end px-2">
      <CursorPaginationControls table={table} busy={busy} pageSizeOptions={PAGE_SIZE_OPTIONS} />
    </div>
  );
}
