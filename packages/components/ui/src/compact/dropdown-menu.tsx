import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour/dropdown-menu';
import { cn } from '@usertour/tailwind';
import { forwardRef } from 'react';

// Compact-family wrappers that snap Content / Item to the inspector's
// rhythm (rounded-lg, p-1, 12px text, tight rows). Root / Trigger are
// passthroughs because they don't carry visual styling. Content keeps a
// 10rem floor so common menus (rename / delete / variation actions) don't
// shrink to button width.

export const CompactDropdownMenu = DropdownMenu;
export const CompactDropdownMenuTrigger = DropdownMenuTrigger;

type ContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuContent>;
export const CompactDropdownMenuContent = forwardRef<
  React.ElementRef<typeof DropdownMenuContent>,
  ContentProps
>(({ className, variant = 'compact', ...props }, ref) => (
  <DropdownMenuContent
    ref={ref}
    variant={variant}
    className={cn('min-w-[10rem]', className)}
    {...props}
  />
));
CompactDropdownMenuContent.displayName = 'CompactDropdownMenuContent';

type ItemProps = React.ComponentPropsWithoutRef<typeof DropdownMenuItem>;
export const CompactDropdownMenuItem = forwardRef<
  React.ElementRef<typeof DropdownMenuItem>,
  ItemProps
>(({ variant = 'compact', ...props }, ref) => (
  <DropdownMenuItem ref={ref} variant={variant} {...props} />
));
CompactDropdownMenuItem.displayName = 'CompactDropdownMenuItem';
