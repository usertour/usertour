"use client";

import { useSegmentListContext } from "@/contexts/segment-list-context";
import { useMutation } from "@apollo/client";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";

import { Button } from "@usertour-ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@usertour-ui/dropdown-menu";
import { updateSegment } from "@usertour-ui/gql";
import { getErrorMessage } from "@usertour-ui/shared-utils";
import { useToast } from "@usertour-ui/use-toast";
import { useCallback } from "react";

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const { refetch, currentSegment } = useSegmentListContext();

  const [mutation] = useMutation(updateSegment);
  const { toast } = useToast();
  const updateSegmentColumn = useCallback(
    async (name: string, value: boolean) => {
      if (!currentSegment) {
        return;
      }
      const data = {
        id: currentSegment.id,
        columns: { ...currentSegment.columns, [name]: value },
      };
      try {
        const ret = await mutation({ variables: { data } });
        if (ret.data?.updateSegment?.id) {
          await refetch();
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: getErrorMessage(error),
        });
      }
    },
    [currentSegment]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <MixerHorizontalIcon className="mr-2 h-4 w-4" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== "undefined" && column.getCanHide()
          )
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={async (value) => {
                  column.toggleVisibility(!!value);
                  await updateSegmentColumn(column.id, !!value);
                }}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
