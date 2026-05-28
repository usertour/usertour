'use client';

import { ColumnDef, Table } from '@tanstack/react-table';
import { Checkbox, DefaultAvatar } from '@usertour/ui';
import { BizUser } from '@usertour/types';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { DataTableColumnHeader } from '@/components/segments/table';

interface UseUserTableColumnsOptions {
  // Drop the row-select column entirely for viewer-role members. Without
  // it the toolbar's hasSelection() stays false and the bulk-action
  // buttons (add to segment, delete, remove) never render — no false
  // affordance for users who can't act on the rows.
  isViewOnly?: boolean;
}

// Hook to create user table columns
export const useUserTableColumns = (
  options: UseUserTableColumnsOptions = {},
): ColumnDef<BizUser>[] => {
  const { isViewOnly = false } = options;
  const { t } = useTranslation();

  return React.useMemo(() => {
    const selectColumn: ColumnDef<BizUser> = {
      id: 'select',
      header: ({ table }: { table: Table<BizUser> }) => (
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

    const externalIdColumn: ColumnDef<BizUser> = {
      id: 'externalId',
      accessorKey: 'externalId',
      header: () => <DataTableColumnHeader title={t('users.table.user')} />,
      cell: ({ row }: any) => {
        const email = row.original.data?.email || '';
        const name = row.original.data?.name || '';
        const externalId = row.original.externalId || '';
        const primary = name || email || externalId;

        return (
          <div className="flex items-center gap-2 w-72 min-w-0">
            <DefaultAvatar seed={externalId || email} name={name} size="sm" />
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
