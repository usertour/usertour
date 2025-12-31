'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@usertour-packages/checkbox';
import { BizCompany } from '@usertour/types';
import { DataTableColumnHeader } from '@/components/molecules/segment/table';
import { UserAvatar } from '@/components/molecules/user-avatar';

export const columns: ColumnDef<BizCompany>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
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
    accessorKey: 'externalId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Company" />,
    cell: ({ row }) => {
      const email = row.original.data?.email || '';
      const name = row.original.data?.name || '';
      const externalId = row.original.externalId || '';

      return (
        <div className="flex items-center gap-2">
          <UserAvatar email={email} name={name} size="sm" />
          <span className="leading-none w-72 truncate">{externalId}</span>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];
