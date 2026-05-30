'use client';

import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  ListSkeleton,
} from '@usertour/ui';

import { useContentAnalytics } from '@/hooks/use-content-analytics';
import { useAppContext } from '@/contexts/app-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentVersion } from '@/hooks/use-content-version';
import { useEventList } from '@/hooks/use-event-list';
import type { PaginationState } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BizSession } from '@usertour/types';
import { buildColumns } from './columns';
import { DataTablePagination } from './data-table-pagination';
import { SessionActionDropdownMenu } from '@/components/sessions/session-action-dropmenu';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { ContentDataType } from '@usertour/types';
import { InboxIcon } from 'lucide-react';

const columnWidthClass: Record<string, string> = {
  bizUserId: 'w-[38%] min-w-[220px]',
  status: 'w-[120px]',
  progress: 'w-[22%] min-w-[140px]',
  createdAt: 'w-[160px]',
};

interface BizSessionsDataTableProps {
  bizSessions: BizSession[];
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  pageCount: number;
  totalCount: number;
  refetch: () => Promise<unknown>;
  loading: boolean;
  isRefetching: boolean;
}

export const BizSessionsDataTable = (props: BizSessionsDataTableProps) => {
  const {
    bizSessions,
    pagination,
    setPagination,
    pageCount,
    totalCount,
    refetch,
    loading,
    isRefetching,
  } = props;
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const { refetch: refetchAnalytics } = useContentAnalytics();
  const { environment } = useAppContext();
  const navigate = useNavigate();

  // All ~20 rows in this table belong to the same content / version, so
  // these three reads are row-shared. Issuing them once here (instead
  // of inside ProgressCell + StatusCell per row) cuts ~80
  // ObservableQuery subscriptions down to 3 — Apollo network dedup
  // already coalesced the requests, but each useQuery still spun up
  // its own cache watcher chain.
  const { contentId } = useContentDetailUI();
  const { content } = useContentDetail(contentId);
  const { eventList } = useEventList();
  const { version } = useContentVersion(content?.editedVersionId);
  const columns = useMemo(
    () => buildColumns({ content, version, eventList }),
    [content, version, eventList],
  );

  const table = useReactTable({
    data: bizSessions,
    columns,
    pageCount,
    manualPagination: true,
    state: {
      sorting,
      pagination,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // First-load gating only — background refetches (after a delete or
  // when dateRange changes inside analytics) keep the prior table
  // rendered instead of collapsing to a skeleton.
  if (loading && bizSessions.length === 0) {
    return (
      <div className="space-y-4">
        <ListSkeleton length={pagination.pageSize} />
        <DataTablePagination table={table} totalCount={totalCount} busy={loading || isRefetching} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border-none">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const widthClass = columnWidthClass[header.column.id] ?? '';
                  return (
                    <TableHead key={header.id} className={widthClass}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
                <TableHead className="w-[48px]" />
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="group h-14 cursor-pointer"
                  onClick={() => {
                    if (environment?.id) {
                      navigate(`/env/${environment.id}/session/${row.original.id}`);
                    }
                  }}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                  <TableCell key={`action-${row.id}`} onClick={(e) => e.stopPropagation()}>
                    <SessionActionDropdownMenu
                      session={row.original}
                      showViewResponse={row.original.content?.type === ContentDataType.FLOW}
                      onDeleteSuccess={() => {
                        refetch();
                        refetchAnalytics();
                      }}
                      onEndSuccess={() => {
                        refetch();
                        refetchAnalytics();
                      }}
                    >
                      <Button
                        variant="ghost"
                        className="flex h-8 w-8 p-0 text-muted-foreground opacity-60 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 data-[state=open]:bg-muted transition-opacity"
                      >
                        <DotsHorizontalIcon className="h-4 w-4" />
                      </Button>
                    </SessionActionDropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow key="no-results">
                <TableCell colSpan={columns.length + 1} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <InboxIcon className="h-8 w-8 opacity-60" />
                    <span className="text-sm">No sessions in this range.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} totalCount={totalCount} busy={loading || isRefetching} />
    </div>
  );
};

BizSessionsDataTable.displayName = 'BizSessionsDataTable';
