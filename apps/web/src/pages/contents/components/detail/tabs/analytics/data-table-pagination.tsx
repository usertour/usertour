import type { Table } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { CursorPaginationControls } from '@/components/cursor-pagination-controls';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

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
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        {t('contents.analytics.sessionsTable.totalCount', { count: totalCount })}
      </div>
      <CursorPaginationControls table={table} busy={busy} pageSizeOptions={PAGE_SIZE_OPTIONS} />
    </div>
  );
}
