"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@usertour-ui/badge";
import { Checkbox } from "@usertour-ui/checkbox";

import { labels, priorities, statuses } from "../data/data";
import { Flow } from "../data/schema";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { format } from "date-fns";

export const columns: ColumnDef<Flow>[] = [
  {
    id: "select",
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
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Id" />
    ),
    cell: ({ row }) => <div className="px-2">{row.getValue("id")}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "externalId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="User" />
    ),
    cell: ({ row }) => <div className="px-2">{row.getValue("externalId")}</div>,
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
    accessorKey: "environmentId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="environmentId" />
    ),
    cell: ({ row }) => (
      <div className="w-[80px]">{row.getValue("environmentId")}</div>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="createdAt" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate font-medium">
            {format(new Date(row.getValue("createdAt")), "PPpp")}
          </span>
        </div>
      );
    },
  },
];
