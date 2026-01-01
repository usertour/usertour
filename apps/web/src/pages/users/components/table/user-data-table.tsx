'use client';

import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useUserListContext } from '@/contexts/user-list-context';
import { useTranslation } from 'react-i18next';
import {
  ColumnDef,
  Table,
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
import { Checkbox } from '@usertour-packages/checkbox';
import { CompanyIcon } from '@usertour-packages/icons';
import { BizUser, BizUserOnCompany, Segment, AttributeBizTypes } from '@usertour/types';
import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DataTableColumnHeader } from '@/components/molecules/segment/table';
import { UserAvatar } from '@/components/molecules/user-avatar';
import {
  DataTable,
  DataTablePagination,
  useDynamicTableColumns,
  buildColumnVisibility,
} from '@/components/molecules/segment/table';
import { UserDataTableToolbar } from './user-data-table-toolbar';

interface UserDataTableProps {
  segment: Segment;
}

export const UserDataTable = ({ segment }: UserDataTableProps) => {
  const { t } = useTranslation();

  // Define table columns
  const columns: ColumnDef<BizUser>[] = [
    {
      id: 'select',
      header: ({ table }: { table: Table<BizUser> }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }: { row: any }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'externalId',
      header: ({ column }: { column: any }) => (
        <DataTableColumnHeader column={column} title={t('users.table.user')} />
      ),
      cell: ({ row }: { row: any }) => {
        const email = row.original.data?.email || '';
        const name = row.original.data?.name || '';
        const companies = row.original.bizUsersOnCompany || [];
        const externalId = row.original.externalId || '';

        return (
          <div className="flex items-center gap-2">
            <UserAvatar email={email} name={name} size="sm" />
            <div className="flex flex-col gap-0.5 w-72">
              <span className="leading-none truncate">{email || externalId}</span>
              {companies.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {companies.slice(0, 3).map((membership: BizUserOnCompany) => (
                    <Link
                      key={membership.id}
                      to={`/env/${row.original.environmentId}/company/${membership.bizCompany?.id}`}
                      className="inline-flex items-center gap-1 rounded-md text-xs hover:text-primary underline-offset-4 hover:underline transition-colors min-w-0 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CompanyIcon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        {membership.bizCompany?.externalId || 'Unknown'}
                      </span>
                    </Link>
                  ))}
                  {companies.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{companies.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];

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
