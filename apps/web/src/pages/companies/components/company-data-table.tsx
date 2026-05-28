'use client';

import { useBizListCursor } from '@/hooks/use-biz-list-cursor';
import { useCompanyListQuery, useListAttributesQuery } from '@usertour/hooks';
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
import { AttributeBizTypes, BizCompany, CurrentConditions, Segment } from '@usertour/types';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  DataTablePagination,
  useDynamicTableColumns,
  buildColumnVisibility,
  buildColumnOrder,
} from '@/components/segments/table';
import { CompanyDataTableToolbar } from './company-data-table-toolbar';
import { useCompanyTableColumns } from '@/hooks/use-company-table-columns';
import { useAppContext } from '@/contexts/app-context';

interface CompanyDataTableProps {
  segment: Segment;
  environmentId: string;
  // See user-data-table.tsx for why we forward only the setter.
  setCurrentConditions: React.Dispatch<React.SetStateAction<CurrentConditions | undefined>>;
}

export const CompanyDataTable = ({
  segment,
  environmentId,
  setCurrentConditions,
}: CompanyDataTableProps) => {
  const { t } = useTranslation();
  const { isViewOnly, project } = useAppContext();
  const columns = useCompanyTableColumns({ isViewOnly });
  // Apollo cache dedups with the toolbar's identical call.
  const { attributes: attributeList } = useListAttributesQuery(
    project?.id ?? '',
    AttributeBizTypes.Nil,
    { skip: !project?.id },
  );
  const navigate = useNavigate();

  const [query, setQuery] = React.useState<{ [key: string]: unknown }>({});
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 20 });

  const effectiveQuery = React.useMemo(
    () => ({ ...query, segmentId: segment.id }),
    [query, segment.id],
  );

  const { contents, loading, refetch, pageCount } = useBizListCursor<BizCompany>({
    environmentId,
    query: effectiveQuery,
    pagination,
    useListQuery: useCompanyListQuery,
  });

  const { tableColumns } = useDynamicTableColumns<BizCompany>(
    attributeList,
    AttributeBizTypes.Company,
    columns,
  );

  const staticColumnIds = React.useMemo(
    () => columns.map((c) => c.id).filter((id): id is string => !!id),
    [columns],
  );

  const companyAttrList = React.useMemo(
    () => attributeList?.filter((attr) => attr.bizType === AttributeBizTypes.Company) || [],
    [attributeList],
  );

  const baseColumnVisibility = React.useMemo(
    () => buildColumnVisibility(companyAttrList, segment.columns),
    [companyAttrList, segment.columns],
  );

  const baseColumnOrder = React.useMemo(
    () => buildColumnOrder(companyAttrList, segment.columns, staticColumnIds),
    [companyAttrList, segment.columns, staticColumnIds],
  );

  // See user-data-table.tsx — segment switches remount via `key=`, so
  // these initial values apply on each switch without a reset effect.
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

  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);

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
    (row: BizCompany) => {
      const envId = row.environmentId;
      const companyId = row.id;
      if (!envId || !companyId) {
        console.warn('Company row missing required fields for navigation');
        return;
      }
      navigate(`/env/${envId}/company/${companyId}`);
    },
    [navigate],
  );

  return (
    <div className="space-y-2">
      <CompanyDataTableToolbar
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
        emptyMessage={t('companies.empty.noCompaniesFound')}
        emptyDescription={t('companies.empty.noCompaniesFoundDescription')}
      />
      <DataTablePagination table={table} />
    </div>
  );
};
