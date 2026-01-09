'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Attribute } from '@usertour/types';
import { DynamicColumnConfig, TableStyles } from './types';
import { DataTableColumnHeader } from './data-table-column-header';
import { formatAttributeValue } from '@/utils/common';

// Type guard to safely access data
const getDataValue = (row: any, key: string): unknown => {
  if (!row?.data || typeof row.data !== 'object') {
    return undefined;
  }
  const data = row.data as Record<string, unknown>;
  return data[key];
};

// Column builder utilities
const createColumnAccessor = (codeName: string) => (row: any) => getDataValue(row, codeName);

const createColumnHeader =
  (displayName: string, className?: string) =>
  ({ column }: { column: any }) => (
    <DataTableColumnHeader
      column={column}
      title={displayName}
      className={className || TableStyles.HEADER_CONSTRAINED}
    />
  );

const createColumnCell =
  (codeName: string, dataType: number, className?: string) =>
  ({ row }: { row: any }) => {
    const value = row.getValue(codeName);
    return (
      <div className={className || TableStyles.CELL_CONSTRAINED}>
        {formatAttributeValue(value, dataType)}
      </div>
    );
  };

// Create dynamic column from attribute configuration
export const createDynamicColumn = <TData,>(
  attribute: Attribute | DynamicColumnConfig,
  options?: {
    headerClassName?: string;
    cellClassName?: string;
  },
): ColumnDef<TData> => {
  const displayName = attribute.displayName || attribute.codeName;

  return {
    accessorFn: createColumnAccessor(attribute.codeName),
    id: attribute.codeName,
    header: createColumnHeader(displayName, options?.headerClassName),
    cell: createColumnCell(attribute.codeName, attribute.dataType, options?.cellClassName),
    enableSorting: false,
    enableHiding: true,
  };
};

// Hook for managing dynamic table columns
export const useDynamicTableColumns = <TData,>(
  attributes: Attribute[] | undefined,
  bizType?: number,
  staticColumns: ColumnDef<TData>[] = [],
) => {
  const dynamicColumns = React.useMemo(() => {
    if (!attributes?.length || !bizType) return [];

    const filteredAttributes = attributes.filter((attr) => attr.bizType === bizType);
    if (!filteredAttributes.length) return [];

    return filteredAttributes.map((attribute) => createDynamicColumn<TData>(attribute));
  }, [attributes, bizType]);

  const tableColumns = React.useMemo(() => {
    return [...staticColumns, ...dynamicColumns];
  }, [staticColumns, dynamicColumns]);

  return {
    tableColumns,
    dynamicColumns,
  };
};

// Build column visibility state from attributes and segment configuration
export const buildColumnVisibility = (
  attributes: Attribute[],
  segmentColumns?: Record<string, boolean>,
): Record<string, boolean> => {
  const visibility: Record<string, boolean> = {};

  for (const attribute of attributes) {
    visibility[attribute.codeName] = !!segmentColumns?.[attribute.codeName];
  }

  return visibility;
};
