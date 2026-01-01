'use client';

import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useUserListContext } from '@/contexts/user-list-context';
import { useTranslation } from 'react-i18next';
import {
  ColumnFiltersState,
  SortingState,
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

  // Column visibility state
  const baseColumnVisibility = React.useMemo(() => {
    const attrList = attributeList?.filter((attr) => attr.bizType === AttributeBizTypes.User) || [];
    return buildColumnVisibility(attrList, segment.columns);
  }, [attributeList, segment.columns]);

  const [userColumnVisibility, setUserColumnVisibility] = React.useState<VisibilityState>({});

  const columnVisibility = React.useMemo(
    () => ({
      ...baseColumnVisibility,
      ...userColumnVisibility,
    }),
    [baseColumnVisibility, userColumnVisibility],
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
