'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@usertour-packages/checkbox';
import { BizUser } from '@usertour/types';
import { CompanyIcon } from '@usertour-packages/icons';

import { DataTableColumnHeader } from '@/components/molecules/segment/table';
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
    accessorKey: 'externalId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
    cell: ({ row }) => {
      const email = row.original.data?.email || '';
      const name = row.original.data?.name || '';
      const companies = row.original.bizUsersOnCompany || [];
      const externalId = row.original.externalId || '';

      return (
        <div className="flex items-center gap-2">
          <UserAvatar email={email} name={name} size="sm" />
          <div className="flex flex-col gap-0.5 w-72">
            <span className="leading-none truncate">{email || externalId}</span>
            {companies.length > 0 && (
              <div className="flex flex-wrap gap-0.5">
                {companies.slice(0, 3).map((membership) => (
                  <Link
                    key={membership.id}
                    to={`/env/${row.original.environmentId}/company/${membership.bizCompany?.id}`}
                    className="inline-flex items-center gap-1 rounded-md text-xs hover:text-primary underline-offset-4 hover:underline transition-colors min-w-0 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CompanyIcon className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">
                      {membership.bizCompany?.externalId || 'Unknown'}
                    </span>
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
];
