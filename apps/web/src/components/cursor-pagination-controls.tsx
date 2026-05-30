import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons';
import type { Table } from '@tanstack/react-table';
import { Button } from '@usertour/ui';

// "Page X of Y" indicator + First / Prev / Next / Last buttons — the
// bit that's character-for-character identical between the two
// `DataTablePagination` instances (`segments/table` and
// `analytics`). Extracted so the cursor-pagination race fix (the
// `busy` gate that prevents fast double-clicks from racing the
// network) and any future tweaks to the button cluster only have to
// land in one place. The outer wrappers keep their own surrounding
// layout (total-count text / Rows-per-page Select positioning /
// page-size options), which is where they actually differ.

export interface CursorPaginationControlsProps<TData> {
  table: Table<TData>;
  /** Disable all four nav buttons while a cursor-pagination request
   *  is in flight. Pass `loading || isRefetching` from
   *  `useCursorPagination` — without this, a click faster than the
   *  network races into computing the same cursor twice and the
   *  table ends up displaying page N while the pager reads
   *  "Page N+1". */
  busy?: boolean;
}

export function CursorPaginationControls<TData>(props: CursorPaginationControlsProps<TData>) {
  const { table, busy = false } = props;
  return (
    <>
      <div className="flex w-[100px] items-center justify-center text-sm font-medium">
        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          className="hidden h-8 w-8 p-0 lg:flex"
          onClick={() => table.setPageIndex(0)}
          disabled={busy || !table.getCanPreviousPage()}
        >
          <span className="sr-only">Go to first page</span>
          <DoubleArrowLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => table.previousPage()}
          disabled={busy || !table.getCanPreviousPage()}
        >
          <span className="sr-only">Go to previous page</span>
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => table.nextPage()}
          disabled={busy || !table.getCanNextPage()}
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="hidden h-8 w-8 p-0 lg:flex"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={busy || !table.getCanNextPage()}
        >
          <span className="sr-only">Go to last page</span>
          <DoubleArrowRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
