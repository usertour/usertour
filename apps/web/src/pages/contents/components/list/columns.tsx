'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DataTableColumnHeader } from './data-table-column-header';
import { Content } from '@usertour/types';

export const columns: ColumnDef<Content>[] = [
  // {
  //   id: "select",
  //   header: ({ table }) => (
  //     <Checkbox
  //       checked={table.getIsAllPageRowsSelected()}
  //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  //       aria-label="Select all"
  //       className="translate-y-[2px]"
  //     />
  //   ),
  //   cell: ({ row }) => (
  //     <Checkbox
  //       checked={row.getIsSelected()}
  //       onCheckedChange={(value) => row.toggleSelected(!!value)}
  //       aria-label="Select row"
  //       className="translate-y-[2px]"
  //     />
  //   ),
  //   enableSorting: false,
  //   enableHiding: false,
  // },
  {
    accessorKey: 'id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Id" />,
    cell: ({ row }) => <div className="w-[80px]">{row.getValue('id')}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'environmentId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="environmentId" />,
    cell: ({ row }) => <div className="w-[80px]">{row.getValue('environmentId')}</div>,
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <span className="max-w-[500px] font-medium truncate inline-block">
        {row.getValue('name') ?? ''}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="createdAt" />,
    cell: ({ row }) => (
      <span className="max-w-[500px] truncate font-medium">
        {format(new Date(row.getValue('createdAt')), 'PPpp')}
      </span>
    ),
  },
  // {
  //   id: "actions",
  //   cell: ({ row }) => <DataTableRowActions row={row} />,
  // },
];
