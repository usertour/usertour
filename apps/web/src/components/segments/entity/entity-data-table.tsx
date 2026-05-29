'use client';

import { useAppContext } from '@/contexts/app-context';
import { useBizListCursor } from '@/hooks/use-biz-list-cursor';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useListAttributesQuery } from '@usertour/hooks';
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
import { AttributeBizTypes, type CurrentConditions, type Segment } from '@usertour/types';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DataTable,
  DataTablePagination,
  useDynamicTableColumns,
  buildColumnVisibility,
  buildColumnOrder,
} from '../table';
import { useTranslation } from 'react-i18next';
import { EntityDataTableToolbar } from './entity-data-table-toolbar';
import type { EntityConfig } from './entity-config';

interface EntityRow {
  id: string;
  environmentId: string;
}

interface EntityDataTableProps<TRow extends EntityRow> {
  config: EntityConfig<TRow>;
  segment: Segment;
  environmentId: string;
  setCurrentConditions: React.Dispatch<React.SetStateAction<CurrentConditions | undefined>>;
  // Passed through to the toolbar so a column-order update can refresh
  // segmentList — the mutation doesn't auto-propagate under no-cache.
  refetchSegments: () => Promise<unknown>;
}

export function EntityDataTable<TRow extends EntityRow>({
  config,
  segment,
  environmentId,
  setCurrentConditions,
  refetchSegments,
}: EntityDataTableProps<TRow>) {
  const { t } = useTranslation();
  const { isViewOnly, project } = useAppContext();
  const columns = config.useTableColumns({ isViewOnly });
  // Shares the cache slice with the toolbar's identical call via
  // SHARED_CACHE_QUERY_OPTIONS — Apollo dedups, single network request.
  const { attributes: attributeList } = useListAttributesQuery(
    project?.id ?? '',
    AttributeBizTypes.Nil,
    { ...SHARED_CACHE_QUERY_OPTIONS, skip: !project?.id },
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

  const { contents, loading, refetch, pageCount } = useBizListCursor<TRow>({
    environmentId,
    query: effectiveQuery,
    pagination,
    useListQuery: config.useListQuery,
  });

  // Dynamic columns merge segment-configured order/visibility with the
  // available attributes.
  const { tableColumns } = useDynamicTableColumns<TRow>(
    attributeList,
    config.attributeBizType,
    columns,
  );

  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const staticColumnIds = React.useMemo(
    () => columns.map((c) => c.id).filter((id): id is string => !!id),
    [columns],
  );

  const entityAttrList = React.useMemo(
    () => attributeList?.filter((attr) => attr.bizType === config.attributeBizType) ?? [],
    [attributeList, config.attributeBizType],
  );

  const baseColumnVisibility = React.useMemo(
    () => buildColumnVisibility(entityAttrList, segment.columns),
    [entityAttrList, segment.columns],
  );

  const baseColumnOrder = React.useMemo(
    () => buildColumnOrder(entityAttrList, segment.columns, staticColumnIds),
    [entityAttrList, segment.columns, staticColumnIds],
  );

  // Local overrides on top of the segment's baseline columns. No reset
  // effect needed: the caller mounts this component with
  // `key={currentSegment.id}`, so segment switches remount the subtree
  // and these `useState` initial values apply naturally.
  const [userColumnVisibility, setUserColumnVisibility] = React.useState<VisibilityState>({});
  const [userColumnOrder, setUserColumnOrder] = React.useState<string[] | undefined>(undefined);

  const columnVisibility = React.useMemo(
    () => ({ ...baseColumnVisibility, ...userColumnVisibility }),
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
    (row: TRow) => {
      navigate(config.navToDetail(row.environmentId, row.id));
    },
    [navigate, config],
  );

  return (
    <div className="space-y-2">
      <EntityDataTableToolbar
        config={config}
        table={table}
        currentSegment={segment}
        setQuery={setQuery}
        setCurrentConditions={setCurrentConditions}
        refetch={refetch}
        refetchSegments={refetchSegments}
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
        emptyMessage={t(config.i18n.emptyMessage)}
        emptyDescription={t(config.i18n.emptyDescription)}
      />
      <DataTablePagination table={table} />
    </div>
  );
}
