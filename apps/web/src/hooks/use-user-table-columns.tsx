'use client';

import { ColumnDef, Table } from '@tanstack/react-table';
import { Checkbox } from '@usertour/checkbox';
import { BizUser } from '@usertour/types';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { DataTableColumnHeader } from '@/components/segments/table';
import { DefaultAvatar } from '@usertour/ui';

// Hook to create user table columns
export const useUserTableColumns = (): ColumnDef<BizUser>[] => {
  const { t } = useTranslation();

  return React.useMemo(
    () => [
      {
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
      },
      {
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
      },
    ],
    [t],
  );
};
