import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons';
import type { Table } from '@tanstack/react-table';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour/ui';

// "Rows per page" Select + "Page X of Y" indicator + First / Prev /
// Next / Last buttons. The right-hand cluster of every cursor-paginated
// table in the admin app — character-for-character identical between
// `segments/table` and `analytics`. Extracted so the cursor-pagination
// race fix (the `busy` gate that prevents fast double-clicks from
// racing the network) and any future tweaks to the cluster only have
// to land in one place.
//
// The outer wrappers keep their own surrounding layout (per-table
// total-count text, justify-between framing); this component owns the
// cluster from `Rows per page` onward.

export interface CursorPaginationControlsProps<TData> {
  table: Table<TData>;
  /** Disable all four nav buttons + the Rows-per-page Select while a
   *  cursor-pagination request is in flight. Pass `loading ||
   *  isRefetching` from `useCursorPagination` — without this, a click
   *  faster than the network races into computing the same cursor
   *  twice and the table ends up displaying page N while the pager
   *  reads "Page N+1". */
  busy?: boolean;
  /** Options for the Rows-per-page Select. Pass `undefined` to omit
   *  the Select entirely (caller doesn't want page-size switching). */
  pageSizeOptions?: number[];
}

export function CursorPaginationControls<TData>(props: CursorPaginationControlsProps<TData>) {
  const { table, busy = false, pageSizeOptions } = props;
  return (
    <div className="flex items-center space-x-6 lg:space-x-8">
      {pageSizeOptions !== undefined && (
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
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
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
    </div>
  );
}
