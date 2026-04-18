'use client';

import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useUserListContext } from '@/contexts/user-list-context';
import { useTranslation } from 'react-i18next';
import {
  ColumnFiltersState,
  SortingState,
  Updater,
  VisibilityState,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
} from '@tanstack/react-table';
import { BizUser, Segment, AttributeBizTypes } from '@usertour/types';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DataTable,
  DataTablePagination,
  useDynamicTableColumns,
  buildColumnVisibility,
  buildColumnOrder,
} from '@/components/molecules/segment/table';
import { UserDataTableToolbar } from './user-data-table-toolbar';
import { useUserTableColumns } from '@/hooks/use-user-table-columns';

interface UserDataTableProps {
  segment: Segment;
}

export const UserDataTable = ({ segment }: UserDataTableProps) => {
  const { t } = useTranslation();
  const columns = useUserTableColumns();

  const { setQuery, setPagination, pagination, pageCount, contents, loading } =
    useUserListContext();
  const { attributeList } = useAttributeListContext();
  const navigate = useNavigate();

  // Set query when segment changes
  React.useEffect(() => {
    setQuery({ segmentId: segment.id });
  }, [segment, setQuery]);

  // Use dynamic column management
  const { tableColumns } = useDynamicTableColumns<BizUser>(
    attributeList,
    AttributeBizTypes.User,
    columns,
  );

  // State management for table
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Static column ids (checkbox, etc.) that must lead the order regardless of segment config
  const staticColumnIds = React.useMemo(
    () => columns.map((c) => c.id).filter((id): id is string => !!id),
    [columns],
  );

  // Column visibility + order state derived from segment
  const userAttrList = React.useMemo(
    () => attributeList?.filter((attr) => attr.bizType === AttributeBizTypes.User) || [],
    [attributeList],
  );

  const baseColumnVisibility = React.useMemo(
    () => buildColumnVisibility(userAttrList, segment.columns),
    [userAttrList, segment.columns],
  );

  const baseColumnOrder = React.useMemo(
    () => buildColumnOrder(userAttrList, segment.columns, staticColumnIds),
    [userAttrList, segment.columns, staticColumnIds],
  );

  const [userColumnVisibility, setUserColumnVisibility] = React.useState<VisibilityState>({});
  const [userColumnOrder, setUserColumnOrder] = React.useState<string[] | undefined>(undefined);

  // Reset local overrides when segment changes
  React.useEffect(() => {
    setUserColumnVisibility({});
    setUserColumnOrder(undefined);
  }, [segment.id]);

  const columnVisibility = React.useMemo(
    () => ({
      ...baseColumnVisibility,
      ...userColumnVisibility,
    }),
    [baseColumnVisibility, userColumnVisibility],
  );

  const columnOrder = userColumnOrder ?? baseColumnOrder;

  const handleColumnOrderChange = React.useCallback(
    (updaterOrValue: Updater<string[]>) => {
      setUserColumnOrder((prev) => {
        const current = prev ?? baseColumnOrder;
        return typeof updaterOrValue === 'function' ? updaterOrValue(current) : updaterOrValue;
      });
    },
    [baseColumnOrder],
  );

  // Memoize table state to prevent unnecessary re-renders
  const tableState = React.useMemo(
    () => ({
      sorting,
      pagination,
      columnVisibility,
      columnOrder,
      rowSelection,
      columnFilters,
    }),
    [sorting, pagination, columnVisibility, columnOrder, rowSelection, columnFilters],
  );

  // Create the table instance
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
    onColumnVisibilityChange: setUserColumnVisibility,
    onColumnOrderChange: handleColumnOrderChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // Stable click handler
  const handleRowClick = React.useCallback(
    (row: BizUser) => {
      const environmentId = row.environmentId;
      const userId = row.id;
      navigate(`/env/${environmentId}/user/${userId}`);
    },
    [navigate],
  );

  return (
    <div className="space-y-2">
      <UserDataTableToolbar table={table} currentSegment={segment} />
      <DataTable
        data={contents}
        columns={tableColumns}
        loading={loading}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setUserColumnVisibility}
        columnOrder={columnOrder}
        onColumnOrderChange={handleColumnOrderChange}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        onRowClick={handleRowClick}
        segment={segment}
        emptyMessage={t('users.empty.noUsersFound')}
        emptyDescription={t('users.empty.noUsersFoundDescription')}
      />
      <DataTablePagination table={table} />
    </div>
  );
};
