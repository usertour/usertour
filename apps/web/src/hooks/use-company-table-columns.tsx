'use client';

import { ColumnDef, Table } from '@tanstack/react-table';
import { Checkbox, DefaultAvatar } from '@usertour/ui';
import { BizCompany } from '@usertour/types';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { DataTableColumnHeader } from '@/components/segments/table';

interface UseCompanyTableColumnsOptions {
  // Drop the row-select column entirely for viewer-role members. Without
  // it the toolbar's hasSelection() stays false and the bulk-action
  // buttons (add to segment, delete, remove) never render — no false
  // affordance for users who can't act on the rows.
  isViewOnly?: boolean;
}

// Hook to create company table columns
export const useCompanyTableColumns = (
  options: UseCompanyTableColumnsOptions = {},
): ColumnDef<BizCompany>[] => {
  const { isViewOnly = false } = options;
  const { t } = useTranslation();

  return React.useMemo(() => {
    const selectColumn: ColumnDef<BizCompany> = {
      id: 'select',
      header: ({ table }: { table: Table<BizCompany> }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }: any) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };

    const externalIdColumn: ColumnDef<BizCompany> = {
      id: 'externalId',
      accessorKey: 'externalId',
      header: () => <DataTableColumnHeader title={t('companies.table.company')} />,
      cell: ({ row }: any) => {
        const name = row.original.data?.name || '';
        const externalId = row.original.externalId || '';
        const primary = name || externalId;

        return (
          <div className="flex items-center gap-2 w-72 min-w-0">
            <DefaultAvatar seed={externalId || name} name={name} size="sm" />
            <span className="truncate">{primary}</span>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    };

    return isViewOnly ? [externalIdColumn] : [selectColumn, externalIdColumn];
  }, [isViewOnly, t]);
};
