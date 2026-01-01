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
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  DataTablePagination,
  useDynamicTableColumns,
  buildColumnVisibility,
} from '@/components/molecules/segment/table';
import { CompanyDataTableToolbar } from './company-data-table-toolbar';
import { useCompanyTableColumns } from '@/hooks/use-company-table-columns';

interface CompanyDataTableProps {
  segment: Segment;
}

export const CompanyDataTable = ({ segment }: CompanyDataTableProps) => {
  const { t } = useTranslation();
  const columns = useCompanyTableColumns();

  const { setQuery, setPagination, pagination, pageCount, contents, loading } =
    useCompanyListContext();
  const { attributeList } = useAttributeListContext();
  const navigate = useNavigate();

  // Set query when segment changes
  React.useEffect(() => {
    setQuery({ segmentId: segment.id });
  }, [segment, setQuery]);

  // Use dynamic column management for companies
  const { tableColumns } = useDynamicTableColumns<BizCompany>(
    attributeList,
    AttributeBizTypes.Company,
    columns,
  );

  // Column visibility state
  const baseColumnVisibility = React.useMemo(() => {
    const attrList =
      attributeList?.filter((attr) => attr.bizType === AttributeBizTypes.Company) || [];
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
    (row: BizCompany) => {
      const environmentId = row.environmentId;
      const companyId = row.id;
      if (!environmentId || !companyId) {
        console.warn('Company row missing required fields for navigation');
        return;
      }
      navigate(`/env/${environmentId}/company/${companyId}`);
    },
    [navigate],
  );

  return (
    <div className="space-y-2">
      <CompanyDataTableToolbar table={table} currentSegment={segment} />
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
        emptyMessage={t('companies.empty.noCompaniesFound')}
        emptyDescription={t('companies.empty.noCompaniesFoundDescription')}
      />
      <DataTablePagination table={table} />
    </div>
  );
};
