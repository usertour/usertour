'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@usertour-packages/checkbox';
import { BizUser } from '@usertour-packages/types';
import { CompanyIcon } from '@usertour-packages/icons';

import { format } from 'date-fns';
import { DataTableColumnHeader } from './data-table-column-header';
import { UserAvatar } from '@/components/molecules/user-avatar';
import { Link } from 'react-router-dom';

export const columns: ColumnDef<BizUser>[] = [
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
      const email = row.original.data?.email || '';
      const name = row.original.data?.name || '';
      const companies = row.original.bizUsersOnCompany || [];

      return (
        <div className="flex items-center gap-2 p-2">
          <UserAvatar email={email} name={name} size="sm" />
          <div className="flex flex-col gap-0.5">
            <span className="leading-none">{email || row.getValue('externalId')}</span>
            {companies.length > 0 && (
              <div className="flex flex-wrap gap-0.5">
                {companies.slice(0, 3).map((membership) => (
                  <Link
                    key={membership.id}
                    to={`/env/${row.original.environmentId}/company/${membership.bizCompany?.id}`}
                    className="inline-flex items-center gap-1 rounded-md text-xs hover:text-primary underline-offset-4 hover:underline transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CompanyIcon className="w-3 h-3" />
                    <span>{membership.bizCompany?.externalId || 'Unknown'}</span>
                  </Link>
                ))}
                {companies.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{companies.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
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

export const columnsSystem: ColumnDef<BizUser>[] = [
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
