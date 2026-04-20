'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Attribute, ColumnSetting } from '@usertour/types';
import { DynamicColumnConfig } from './types';
import { DataTableColumnHeader } from './data-table-column-header';
import { cellContainerClass, renderAttributeCell } from './cells';

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
  (displayName: string, dataType: number, className?: string) =>
  ({ column }: { column: any }) => (
    <DataTableColumnHeader
      column={column}
      title={displayName}
      className={className ?? cellContainerClass(dataType)}
    />
  );

const createColumnCell =
  (codeName: string, dataType: number, className?: string) =>
  ({ row }: { row: any }) => {
    const value = row.getValue(codeName);
    return (
      <div className={className ?? cellContainerClass(dataType)}>
        {renderAttributeCell(value, dataType)}
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
    header: createColumnHeader(displayName, attribute.dataType, options?.headerClassName),
    cell: createColumnCell(attribute.codeName, attribute.dataType, options?.cellClassName),
    enableSorting: false,
    enableHiding: true,
    meta: { displayName },
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
  segmentColumns?: ColumnSetting[] | null,
): Record<string, boolean> => {
  const settingMap = new Map(
    (segmentColumns ?? []).map(({ codeName, visible }) => [codeName, visible]),
  );
  const visibility: Record<string, boolean> = {};

  for (const attribute of attributes) {
    visibility[attribute.codeName] = !!settingMap.get(attribute.codeName);
  }

  return visibility;
};

// Build column order from segment configuration; attributes not yet in segment.columns go to the end.
export const buildColumnOrder = (
  attributes: Attribute[],
  segmentColumns?: ColumnSetting[] | null,
  staticColumnIds: string[] = [],
): string[] => {
  const attrCodeNames = new Set(attributes.map((a) => a.codeName));
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const { codeName } of segmentColumns ?? []) {
    if (attrCodeNames.has(codeName) && !seen.has(codeName)) {
      ordered.push(codeName);
      seen.add(codeName);
    }
  }
  for (const attribute of attributes) {
    if (!seen.has(attribute.codeName)) {
      ordered.push(attribute.codeName);
      seen.add(attribute.codeName);
    }
  }

  return [...staticColumnIds, ...ordered];
};
