'use client';

import {
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
import { Skeleton } from '@usertour-packages/skeleton';
import { DataTableProps, TableStyles } from './types';
import { EmptyPlaceholder } from '../ui';
import * as React from 'react';

// Helper function to build skeleton table
const renderSkeletonRow = (columns: any[], rowIndex: number) => (
  <TableRow key={`skeleton-${rowIndex}`}>
    {columns.map((column, colIndex) => (
      <TableCell key={`skeleton-cell-${rowIndex}-${column.id || colIndex}`}>
        <Skeleton className="h-4 w-full" />
      </TableCell>
    ))}
  </TableRow>
);

// Generic DataTable component
export function DataTable<TData>({
  data,
  columns,
  loading = false,
  pageCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  columnVisibility,
  onColumnVisibilityChange,
  columnFilters,
  onColumnFiltersChange,
  onRowClick,
  emptyMessage = 'No results found',
  emptyDescription = 'Try adjusting your filters or search terms',
  className,
}: DataTableProps<TData>) {
  // Memoize table state to prevent unnecessary re-renders
  const tableState = React.useMemo(
    () => ({
      sorting,
      pagination,
      columnVisibility,
      rowSelection,
      columnFilters,
    }),
    [sorting, pagination, columnVisibility, rowSelection, columnFilters],
  );

  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualPagination: true,
    state: tableState,
    enableRowSelection: true,
    onRowSelectionChange,
    onSortingChange,
    onPaginationChange,
    onColumnFiltersChange,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // Loading state with skeleton table
  if (loading && !data.length) {
    const visibleColumns = table
      .getAllColumns()
      .filter((column) => columnVisibility[column.id] !== false);

    return (
      <div className="overflow-x-auto">
        <Table className={`min-w-2xl ${className ?? ''}`}>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((column, colIndex) => (
                <TableHead
                  key={`header-skeleton-${column.id || colIndex}`}
                  className={column.id === 'select' ? 'w-10' : undefined}
                >
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: TableStyles.SKELETON_ROWS as number }, (_, index) =>
              renderSkeletonRow(visibleColumns, index),
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className={`min-w-2xl ${className ?? ''}`}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className={header.id === 'select' ? 'w-10' : undefined}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={`cursor-pointer hover:bg-muted/50 ${onRowClick ? '' : 'cursor-default'}`}
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map((cell) => {
                  try {
                    const cellContent = flexRender(cell.column.columnDef.cell, cell.getContext());
                    return (
                      <TableCell
                        key={cell.id}
                        className="leading-8 py-4"
                        onClick={() => {
                          if (cell.column.id !== 'select' && onRowClick) {
                            onRowClick(row.original);
                          }
                        }}
                      >
                        {cellContent}
                      </TableCell>
                    );
                  } catch (error) {
                    console.error('Error rendering cell:', cell.id, error);
                    return (
                      <TableCell key={cell.id} className="leading-8 py-4">
                        <span className="text-red-500">Error</span>
                      </TableCell>
                    );
                  }
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                <EmptyPlaceholder name={emptyMessage} description={emptyDescription}>
                  <div />
                </EmptyPlaceholder>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
