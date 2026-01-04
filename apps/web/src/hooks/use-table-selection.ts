import { useCallback } from 'react';
import { Table } from '@tanstack/react-table';

/**
 * Generic hook for table selection operations
 * Provides utilities for working with selected rows in tables
 */
export const useTableSelection = <T extends { id: string }>(table: Table<T>) => {
  const collectSelectedIds = useCallback(() => {
    return table.getFilteredSelectedRowModel().rows.map((row) => row.original.id);
  }, [table]);

  const hasSelection = useCallback(() => {
    return table.getFilteredSelectedRowModel().rows.length > 0;
  }, [table]);

  const getSelectedCount = useCallback(() => {
    return collectSelectedIds().length;
  }, [collectSelectedIds]);

  return {
    collectSelectedIds,
    hasSelection,
    getSelectedCount,
  };
};
