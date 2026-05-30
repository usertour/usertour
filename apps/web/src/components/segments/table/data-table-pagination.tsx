import { CursorPaginationControls } from '@/components/cursor-pagination-controls';
import { DataTablePaginationProps } from './types';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export function DataTablePagination<TData extends { id: string }>(
  props: DataTablePaginationProps<TData>,
) {
  const { table, busy = false, totalCountText } = props;
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">{totalCountText}</div>
      <CursorPaginationControls table={table} busy={busy} pageSizeOptions={PAGE_SIZE_OPTIONS} />
    </div>
  );
}
