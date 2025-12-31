'use client';

import { ColumnDef, Table, Updater } from '@tanstack/react-table';
import { Segment } from '@usertour/types';

// Generic table props interface
export interface DataTableProps<TData> {
  // Core data and configuration
  data: TData[];
  columns: ColumnDef<TData>[];
  segment: Segment;

  // Loading state
  loading?: boolean;

  // Pagination
  pageCount: number;
  pagination: {
    pageIndex: number;
    pageSize: number;
  };
  onPaginationChange: (updaterOrValue: Updater<{ pageIndex: number; pageSize: number }>) => void;

  // Sorting
  sorting: Array<{ id: string; desc: boolean }>;
  onSortingChange: (updaterOrValue: Updater<Array<{ id: string; desc: boolean }>>) => void;

  // Row selection
  rowSelection: Record<string, boolean>;
  onRowSelectionChange: (updaterOrValue: Updater<Record<string, boolean>>) => void;

  // Column visibility
  columnVisibility: Record<string, boolean>;
  onColumnVisibilityChange: (updaterOrValue: Updater<Record<string, boolean>>) => void;

  // Filtering
  columnFilters: Array<{ id: string; value: unknown }>;
  onColumnFiltersChange: (updaterOrValue: Updater<Array<{ id: string; value: unknown }>>) => void;

  // Callbacks
  onRowClick?: (row: TData) => void;

  // Customization
  emptyMessage?: string;
  emptyDescription?: string;
  className?: string;
}

// Toolbar props interface
export interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  currentSegment: Segment;
  searchPlaceholder?: string;
  showFilters?: boolean;
  showViewOptions?: boolean;
  customActions?: React.ReactNode;
}

// Pagination props interface
export interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

// Column header props interface
export interface DataTableColumnHeaderProps {
  column: any;
  title: string;
  className?: string;
}

// View options props interface
export interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => Promise<void>;
}

// Faceted filter props interface
export interface DataTableFacetedFilterProps {
  column?: any;
  title?: string;
  options: Array<{
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }>;
}

// Dynamic column configuration
export interface DynamicColumnConfig {
  codeName: string;
  displayName: string;
  dataType: number;
  bizType: number;
  enabled?: boolean;
}

// Table styles constants
export enum TableStyles {
  CELL_CONSTRAINED = 'min-w-24 max-w-72 truncate',
  HEADER_CONSTRAINED = 'min-w-24 max-w-72 truncate',
  SKELETON_ROWS = 5,
}
