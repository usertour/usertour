'use client';

import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { RiLayoutColumnLine } from '@usertour-packages/icons';

import { Button } from '@usertour-packages/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
} from '@usertour-packages/dropdown-menu';
import { cn } from '@usertour-packages/tailwind';
import { DataTableViewOptionsProps } from './types';
import { ScrollArea } from '@usertour-packages/scroll-area';

export function DataTableViewOptions<TData>({
  table,
  onColumnVisibilityChange,
  disabled = false,
}: DataTableViewOptionsProps<TData>) {
  const columns = table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
          disabled={disabled}
        >
          <RiLayoutColumnLine className="mr-2 h-4 w-4" />
          Customize Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <ScrollArea className={cn(columns.length > 10 ? 'h-80' : 'h-auto')}>
          {columns.map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="cursor-pointer"
                checked={column.getIsVisible()}
                disabled={disabled}
                onCheckedChange={async (value) => {
                  if (disabled) return;
                  column.toggleVisibility(!!value);
                  if (onColumnVisibilityChange) {
                    await onColumnVisibilityChange(column.id, !!value);
                  }
                }}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            );
          })}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
