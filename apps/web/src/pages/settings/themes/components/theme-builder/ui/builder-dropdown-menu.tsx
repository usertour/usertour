import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { cn } from '@usertour-packages/tailwind';
import { forwardRef } from 'react';

// V2 wrappers around the shared DropdownMenu pieces. Trigger / Root / Content
// are passthroughs; Item pins to the builder's 12px / tight-row rhythm so
// menus inside the theme builder stay visually consistent with the rest of
// the panel.

export const BuilderDropdownMenu = DropdownMenu;
export const BuilderDropdownMenuTrigger = DropdownMenuTrigger;

type ContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuContent>;
export const BuilderDropdownMenuContent = forwardRef<
  React.ElementRef<typeof DropdownMenuContent>,
  ContentProps
>(({ className, ...props }, ref) => (
  <DropdownMenuContent ref={ref} className={cn('min-w-[10rem] p-1', className)} {...props} />
));
BuilderDropdownMenuContent.displayName = 'BuilderDropdownMenuContent';

type ItemProps = React.ComponentPropsWithoutRef<typeof DropdownMenuItem>;
export const BuilderDropdownMenuItem = forwardRef<
  React.ElementRef<typeof DropdownMenuItem>,
  ItemProps
>(({ className, ...props }, ref) => (
  <DropdownMenuItem
    ref={ref}
    className={cn('gap-2 px-2 py-1 text-xs leading-tight', className)}
    {...props}
  />
));
BuilderDropdownMenuItem.displayName = 'BuilderDropdownMenuItem';
