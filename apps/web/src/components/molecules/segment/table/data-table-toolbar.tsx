'use client';

import { Input } from '@usertour-packages/input';
import { DataTableToolbarProps } from './types';
import { DataTableViewOptions } from './data-table-view-options';

export function DataTableToolbar<TData>({
  table,
  showFilters = true,
  showViewOptions = true,
  customActions,
}: DataTableToolbarProps<TData>) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          {showFilters && (
            <Input
              placeholder="Search..."
              value=""
              onChange={() => {}}
              className="h-8 w-[150px] lg:w-[250px]"
            />
          )}
          {customActions}
        </div>
        {showViewOptions && <DataTableViewOptions table={table} />}
      </div>
    </>
  );
}
