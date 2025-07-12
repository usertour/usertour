'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@usertour-ui/checkbox';

import { format } from 'date-fns';
import { Flow } from '../data/schema';
import { DataTableColumnHeader } from './data-table-column-header';
import { UserAvatar } from '@/components/molecules/user-avatar';

export const columns: ColumnDef<Flow>[] = [
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
    accessorKey: 'id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Id" />,
    cell: ({ row }) => <div className="px-2">{row.getValue('id')}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'externalId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
    cell: ({ row }) => {
      const email = row.original.email || '';
      const name = row.original.name || '';

      return (
        <div className="px-2 flex items-center gap-2">
          <UserAvatar email={email} name={name} size="sm" />
          <span>{row.getValue('externalId')}</span>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  // {
  //   accessorKey: "environmentId",
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title="environmentId" />
  //   ),
  //   cell: ({ row }) => <div className="w-[80px]">{row.getValue("environmentId")}</div>,
  //   enableSorting: false,
  //   enableHiding: true,
  // },
  // {
  //   accessorKey: "createdAt",
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title="createdAt" />
  //   ),
  //   cell: ({ row }) => {

  //     return (
  //       <div className="flex space-x-2">
  //         <span className="max-w-[500px] truncate font-medium">
  //           {row.getValue("createdAt")}
  //         </span>
  //       </div>
  //     )
  //   },
  // },
  // {
  //   id: "actions",
  //   cell: ({ row }) => <DataTableRowActions row={row} />,
  // },
];

export const columnsSystem: ColumnDef<Flow>[] = [
  {
    accessorKey: 'environmentId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="environmentId" />,
    cell: ({ row }) => <div className="w-[80px]">{row.getValue('environmentId')}</div>,
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="createdAt" />,
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate font-medium">
            {format(new Date(row.getValue('createdAt')), 'PPpp')}
          </span>
        </div>
      );
    },
  },
];
