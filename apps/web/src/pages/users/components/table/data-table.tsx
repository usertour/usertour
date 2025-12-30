'use client';

import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useUserListContext } from '@/contexts/user-list-context';
import { useTranslation } from 'react-i18next';
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
import { ColumnDef } from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { BizUser, Segment, Attribute } from '@usertour/types';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { columns } from './columns';
import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';
import { DataTableColumnHeader } from './data-table-column-header';
import { formatAttributeValue } from '@/utils/common';
import { TableStyles } from './columns';
import { Skeleton } from '@usertour-packages/skeleton';

// Removed unused interface

// Custom hook for managing dynamic table columns
const useDynamicTableColumns = (attributeList: Attribute[] | undefined) => {
  const dynamicColumns = React.useMemo(() => {
    const attrList = attributeList?.filter((attr) => attr.bizType === 1);
    if (!attrList?.length) return [];

    return attrList.map((attribute) => createDynamicColumn(attribute));
  }, [attributeList]);

  const tableColumns = React.useMemo(() => {
    return [...columns, ...dynamicColumns];
  }, [dynamicColumns]);

  return {
    tableColumns,
  };
};

// Type guard to safely access user data
const getUserDataValue = (row: BizUser, key: string): unknown => {
  if (!row?.data || typeof row.data !== 'object') {
    return undefined;
  }

  const data = row.data as Record<string, unknown>;
  return data[key];
};

// Column builder utilities
const createColumnAccessor = (codeName: string) => (row: BizUser) =>
  getUserDataValue(row, codeName);

const createColumnHeader =
  (displayName: string) =>
  ({ column }: { column: any }) => (
    <DataTableColumnHeader
      column={column}
      title={displayName}
      className={TableStyles.HEADER_CONSTRAINED as string}
    />
  );

const createColumnCell =
  (codeName: string, dataType: number) =>
  ({ row }: { row: any }) => {
    const value = row.getValue(codeName);
    return (
      <div className={TableStyles.CELL_CONSTRAINED as string}>
        {formatAttributeValue(value, dataType)}
      </div>
    );
  };

const createDynamicColumn = (attribute: Attribute): ColumnDef<BizUser> => {
  const displayName = attribute.displayName || attribute.codeName;

  return {
    accessorFn: createColumnAccessor(attribute.codeName),
    id: attribute.codeName,
    header: createColumnHeader(displayName),
    cell: createColumnCell(attribute.codeName, attribute.dataType),
    enableSorting: false,
    enableHiding: true,
  };
};

// Helper function to build column visibility state
const buildColumnVisibility = (
  attrList: Attribute[],
  segmentColumns?: Record<string, boolean>,
): VisibilityState => {
  // Default column visibility settings - only dynamic attributes can be hidden
  const visibility: VisibilityState = {};

  for (const attribute of attrList) {
    visibility[attribute.codeName] = !!segmentColumns?.[attribute.codeName];
  }

  return visibility;
};

// Get visible columns based on current visibility state
const getVisibleColumns = (
  tableColumns: ColumnDef<BizUser>[],
  visibility: VisibilityState,
): ColumnDef<BizUser>[] => {
  return tableColumns.filter((column) => {
    const columnId = column.id || (column as any).accessorKey;
    return columnId ? visibility[columnId] !== false : true;
  });
};

// Render skeleton row with proper column count
const renderSkeletonRow = (visibleColumns: ColumnDef<BizUser>[], rowIndex: number) => (
  <TableRow key={`skeleton-${rowIndex}`}>
    {visibleColumns.map((column, colIndex) => (
      <TableCell key={`skeleton-cell-${rowIndex}-${column.id || colIndex}`}>
        <Skeleton className="h-4 w-full" />
      </TableCell>
    ))}
  </TableRow>
);

interface TableProps {
  segment: Segment;
}

export function DataTable({ segment }: TableProps) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const { setQuery, setPagination, pagination, pageCount, contents, loading } =
    useUserListContext();
  const { attributeList } = useAttributeListContext();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Set query when segment changes
  React.useEffect(() => {
    setQuery({ segmentId: segment.id });
  }, [segment, setQuery]);

  // Use custom hook for dynamic column management
  const { tableColumns } = useDynamicTableColumns(attributeList);

  // Base column visibility from configuration
  const baseColumnVisibility = React.useMemo(() => {
    const attrList = attributeList?.filter((attr) => attr.bizType === 1) || [];
    return buildColumnVisibility(attrList, segment.columns);
  }, [attributeList, segment.columns]);

  // User modifications to column visibility (independent of config changes)
  const [userColumnVisibility, setUserColumnVisibility] = React.useState<VisibilityState>({});

  // Final column visibility - merge base config with user modifications
  const columnVisibility = React.useMemo(
    () => ({
      ...baseColumnVisibility,
      ...userColumnVisibility,
    }),
    [baseColumnVisibility, userColumnVisibility],
  );

  // Stable click handler using useCallback
  const handleRowClick = React.useCallback(
    (environmentId: string, id: string) => {
      navigate(`/env/${environmentId}/user/${id}`);
    },
    [navigate],
  );

  // Handle user column visibility changes
  const handleColumnVisibilityChange = React.useCallback(
    (updaterOrValue: VisibilityState | ((old: VisibilityState) => VisibilityState)) => {
      if (typeof updaterOrValue === 'function') {
        setUserColumnVisibility((prev) => {
          const newVisibility = updaterOrValue(prev);
          return { ...prev, ...newVisibility };
        });
      } else {
        setUserColumnVisibility((prev) => ({ ...prev, ...updaterOrValue }));
      }
    },
    [],
  );

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
    data: contents,
    columns: tableColumns,
    pageCount,
    manualPagination: true,
    state: tableState,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // Loading state with simple skeleton table
  if (loading && !contents.length) {
    const visibleColumns = getVisibleColumns(tableColumns, columnVisibility);

    return (
      <Table>
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
    );
  }

  return (
    <div className="space-y-2">
      <DataTableToolbar table={table} currentSegment={segment} />
      <Table className="relative">
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
                className="cursor-pointer hover:bg-muted/50"
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
                          if (cell.column.id !== 'select') {
                            const environmentId = row.original.environmentId;
                            const userId = row.original.id;
                            handleRowClick(environmentId, userId);
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
              <TableCell colSpan={tableColumns.length} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="text-muted-foreground">{t('users.empty.noUsersFound')}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('users.empty.noUsersFoundDescription')}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <DataTablePagination table={table} />
    </div>
  );
}
