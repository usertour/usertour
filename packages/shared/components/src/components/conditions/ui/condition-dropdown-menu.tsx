import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { cn } from '@usertour-packages/tailwind';
import { forwardRef } from 'react';
import { useConditionsZIndex } from '../conditions-context';

export const ConditionDropdownMenu = DropdownMenu;
export const ConditionDropdownMenuTrigger = DropdownMenuTrigger;

type ContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuContent>;
export const ConditionDropdownMenuContent = forwardRef<
  React.ElementRef<typeof DropdownMenuContent>,
  ContentProps
>(({ className, ...props }, ref) => {
  const { dropdown } = useConditionsZIndex();
  return (
    <DropdownMenuContent
      ref={ref}
      // No baseline min-width — callers (e.g. ConditionSelect) anchor the
      // menu to its trigger width via --radix-popper-anchor-width. A blanket
      // min-w-[10rem] inflates narrow pickers (e.g. the 100px time-unit
      // select inside the event editor) so the menu spills past its
      // surrounding popover.
      className={cn('rounded-lg p-1 text-xs', className)}
      style={{ zIndex: dropdown }}
      {...props}
    />
  );
});
ConditionDropdownMenuContent.displayName = 'ConditionDropdownMenuContent';

type ItemProps = React.ComponentPropsWithoutRef<typeof DropdownMenuItem>;
export const ConditionDropdownMenuItem = forwardRef<
  React.ElementRef<typeof DropdownMenuItem>,
  ItemProps
>(({ className, ...props }, ref) => (
  <DropdownMenuItem
    ref={ref}
    className={cn('gap-2 rounded px-2 py-1 text-xs leading-tight', className)}
    {...props}
  />
));
ConditionDropdownMenuItem.displayName = 'ConditionDropdownMenuItem';
