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
} from '@usertour-packages/table';

import { useAppContext } from '@/contexts/app-context';
import { useBizSessionContext } from '@/contexts/biz-session-context';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { columns } from './columns';
import { DataTablePagination } from './data-table-pagination';
import { SessionActionDropdownMenu } from '@/components/molecules/session-action-dropmenu';
import { Button } from '@usertour-packages/button';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { ListSkeleton } from '@/components/molecules/skeleton';
import { ContentDataType } from '@usertour/types';
import { InboxIcon } from 'lucide-react';

const columnWidthClass: Record<string, string> = {
  bizUserId: 'w-[38%] min-w-[220px]',
  status: 'w-[120px]',
  progress: 'w-[22%] min-w-[140px]',
  createdAt: 'w-[160px]',
};

export const BizSessionsDataTable = () => {
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const { setPagination, pagination, pageCount, bizSessions, refetch, loading } =
    useBizSessionContext();
  const { environment } = useAppContext();
  const navigate = useNavigate();

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

  if (loading) {
    return (
      <div className="space-y-4">
        <ListSkeleton length={pagination.pageSize} />
        <DataTablePagination table={table} />
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
                  key={row.id || `row-${Math.random()}`}
                  className="group h-14 cursor-pointer"
                  onClick={() => {
                    if (environment?.id) {
                      navigate(`/env/${environment.id}/session/${row.original.id}`);
                    }
                  }}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id || `cell-${Math.random()}`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                  <TableCell
                    key={`action-${row.id || Math.random()}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SessionActionDropdownMenu
                      session={row.original}
                      showViewResponse={row.original.content?.type === ContentDataType.FLOW}
                      onDeleteSuccess={() => {
                        refetch();
                      }}
                      onEndSuccess={() => {
                        refetch();
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
      <DataTablePagination table={table} />
    </div>
  );
};

BizSessionsDataTable.displayName = 'BizSessionsDataTable';
