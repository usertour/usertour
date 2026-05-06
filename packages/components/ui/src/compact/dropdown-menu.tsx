import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { cn } from '@usertour-packages/tailwind';
import { forwardRef } from 'react';

// Wrappers around the shared DropdownMenu pieces. Trigger / Root are
// passthroughs; Content / Item are styled to match the compact 12px / tight-row
// rhythm used by inspector-style panels.

export const CompactDropdownMenu = DropdownMenu;
export const CompactDropdownMenuTrigger = DropdownMenuTrigger;

type ContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuContent>;
export const CompactDropdownMenuContent = forwardRef<
  React.ElementRef<typeof DropdownMenuContent>,
  ContentProps
>(({ className, ...props }, ref) => (
  <DropdownMenuContent ref={ref} className={cn('min-w-[10rem] p-1', className)} {...props} />
));
CompactDropdownMenuContent.displayName = 'CompactDropdownMenuContent';

type ItemProps = React.ComponentPropsWithoutRef<typeof DropdownMenuItem>;
export const CompactDropdownMenuItem = forwardRef<
  React.ElementRef<typeof DropdownMenuItem>,
  ItemProps
>(({ className, ...props }, ref) => (
  <DropdownMenuItem
    ref={ref}
    className={cn('gap-2 px-2 py-1 text-xs leading-tight', className)}
    {...props}
  />
));
CompactDropdownMenuItem.displayName = 'CompactDropdownMenuItem';
