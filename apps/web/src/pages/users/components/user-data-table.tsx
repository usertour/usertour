'use client';

import { useAppContext } from '@/contexts/app-context';
import { useBizListCursor } from '@/hooks/use-biz-list-cursor';
import { useTranslation } from 'react-i18next';
import { useListAttributesQuery, useUserListQuery } from '@usertour/hooks';
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
import { AttributeBizTypes, BizUser, CurrentConditions, Segment } from '@usertour/types';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DataTable,
  DataTablePagination,
  useDynamicTableColumns,
  buildColumnVisibility,
  buildColumnOrder,
} from '@/components/segments/table';
import { UserDataTableToolbar } from './user-data-table-toolbar';
import { useUserTableColumns } from '@/hooks/use-user-table-columns';

interface UserDataTableProps {
  segment: Segment;
  environmentId: string;
  // DataTable only forwards `setCurrentConditions` to its Toolbar — the
  // value itself lives in UserListContent (read by the FilterSave button
  // in the page header) so it never flows back here.
  setCurrentConditions: React.Dispatch<React.SetStateAction<CurrentConditions | undefined>>;
}

export const UserDataTable = ({
  segment,
  environmentId,
  setCurrentConditions,
}: UserDataTableProps) => {
  const { t } = useTranslation();
  const { isViewOnly, project } = useAppContext();
  const columns = useUserTableColumns({ isViewOnly });
  // Apollo cache dedups with the toolbar's identical call — same project id +
  // AttributeBizTypes.Nil → single network request, both consumers see fresh data.
  const { attributes: attributeList } = useListAttributesQuery(
    project?.id ?? '',
    AttributeBizTypes.Nil,
    { skip: !project?.id },
  );
  const navigate = useNavigate();

  // Per-table UI state owns: query (filter), pagination. Toolbar mutates
  // query via setQuery; DataTable handles pagination via useReactTable.
  // currentConditions lives one level up because the page header's
  // FilterSave button also needs to see it.
  const [query, setQuery] = React.useState<{ [key: string]: unknown }>({});
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 20 });

  const effectiveQuery = React.useMemo(
    () => ({ ...query, segmentId: segment.id }),
    [query, segment.id],
  );

  const { contents, loading, refetch, pageCount } = useBizListCursor<BizUser>({
    environmentId,
    query: effectiveQuery,
    pagination,
    useListQuery: useUserListQuery,
  });

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

  const staticColumnIds = React.useMemo(
    () => columns.map((c) => c.id).filter((id): id is string => !!id),
    [columns],
  );

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

  // Local overrides on top of the segment's baseline columns. No reset
  // effect needed: the caller mounts this component with
  // `key={currentSegment.id}`, so segment switches remount the subtree
  // and these `useState` initial values apply naturally.
  const [userColumnVisibility, setUserColumnVisibility] = React.useState<VisibilityState>({});
  const [userColumnOrder, setUserColumnOrder] = React.useState<string[] | undefined>(undefined);

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

  const table = useReactTable({
    data: contents,
    columns: tableColumns,
    pageCount,
    manualPagination: true,
    state: tableState,
    enableRowSelection: !isViewOnly,
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

  const handleRowClick = React.useCallback(
    (row: BizUser) => {
      navigate(`/env/${row.environmentId}/user/${row.id}`);
    },
    [navigate],
  );

  return (
    <div className="space-y-2">
      <UserDataTableToolbar
        table={table}
        currentSegment={segment}
        setQuery={setQuery}
        setCurrentConditions={setCurrentConditions}
        refetch={refetch}
      />
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
