'use client';

import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useCompanyListContext } from '@/contexts/company-list-context';
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
import { BizCompany, Segment, AttributeBizTypes } from '@usertour/types';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { columns, columnsSystem } from './columns';
import { DataTable, DataTablePagination } from '@/components/molecules/segment/table';
import { CompanyDataTableToolbar } from './company-data-table-toolbar';

interface CompanyDataTableProps {
  segment: Segment;
}

export function CompanyDataTable({ segment }: CompanyDataTableProps) {
  const { setQuery, setPagination, pagination, pageCount, contents, loading } =
    useCompanyListContext();
  const { attributeList } = useAttributeListContext();
  const navigate = useNavigate();

  // Set query when segment changes
  React.useEffect(() => {
    setQuery({ segmentId: segment.id });
  }, [segment, setQuery]);

  // Create dynamic columns for companies (bizType === 2)
  const dynamicColumns = React.useMemo(() => {
    const attrList = attributeList?.filter((attr) => attr.bizType === AttributeBizTypes.Company);
    if (!attrList?.length) return [];

    const _customColumns = [];
    for (const attribute of attrList) {
      const displayName = attribute.displayName || attribute.codeName;
      _customColumns.push({
        accessorFn: (row: BizCompany) => {
          const data = row.data as any;
          return data?.[attribute.codeName];
        },
        id: attribute.codeName,
        header: () => <div className="min-w-24 max-w-72 truncate">{displayName}</div>,
        cell: ({ row }: any) => {
          const value = row.getValue(attribute.codeName);
          return <div className="px-2 min-w-24 max-w-72 truncate">{value || '-'}</div>;
        },
        enableSorting: false,
        enableHiding: true,
      });
    }
    return _customColumns;
  }, [attributeList]);

  // Combine all columns
  const allColumns = React.useMemo(() => {
    return [...columns, ...columnsSystem, ...dynamicColumns];
  }, [dynamicColumns]);

  // Column visibility state
  const baseColumnVisibility = React.useMemo(() => {
    const attrList =
      attributeList?.filter((attr) => attr.bizType === AttributeBizTypes.Company) || [];
    const visibility: VisibilityState = {
      environmentId: false,
      id: false,
    };

    for (const attribute of attrList) {
      visibility[attribute.codeName] = !!segment.columns?.[attribute.codeName];
    }

    return visibility;
  }, [attributeList, segment.columns]);

  const [userColumnVisibility, setUserColumnVisibility] = React.useState<VisibilityState>({});

  const columnVisibility = React.useMemo(
    () => ({
      ...baseColumnVisibility,
      ...userColumnVisibility,
    }),
    [baseColumnVisibility, userColumnVisibility],
  );

  // State management for table
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);

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
    columns: allColumns,
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
    (row: BizCompany) => {
      const environmentId = row.environmentId;
      const companyId = row.id;
      navigate(`/env/${environmentId}/company/${companyId}`);
    },
    [navigate],
  );

  return (
    <div className="space-y-2">
      <CompanyDataTableToolbar table={table} currentSegment={segment} />
      <DataTable
        data={contents}
        columns={allColumns}
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
        emptyMessage="No companies found"
        emptyDescription="Try adjusting your filters or search terms"
      />
      <DataTablePagination table={table} />
    </div>
  );
}
