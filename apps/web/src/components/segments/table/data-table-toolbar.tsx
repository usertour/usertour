'use client';

import { Input } from '@usertour/ui';
import { DataTableToolbarProps } from './types';
import { DataTableViewOptions } from './data-table-view-options';
import { useTranslation } from 'react-i18next';

export function DataTableToolbar<TData>({
  table,
  showFilters = true,
  showViewOptions = true,
  customActions,
}: DataTableToolbarProps<TData>) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          {showFilters && (
            <Input
              placeholder={t('dataTable.searchPlaceholder')}
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
