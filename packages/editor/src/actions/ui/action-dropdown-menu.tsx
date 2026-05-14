import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour/dropdown-menu';
import { forwardRef } from 'react';
import { useActionsZIndex } from '../actions-context';

// Mirrors conditions/ui/condition-dropdown-menu.tsx. The styling comes from
// the atomic DropdownMenu via `variant="compact"`; what we add here is the
// dropdown z-index from ActionsContext so menus stack correctly above the
// chip popovers that contain them.
export const ActionDropdownMenu = DropdownMenu;
export const ActionDropdownMenuTrigger = DropdownMenuTrigger;

type ContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuContent>;
export const ActionDropdownMenuContent = forwardRef<
  React.ElementRef<typeof DropdownMenuContent>,
  ContentProps
>(({ variant = 'compact', style, ...props }, ref) => {
  const { dropdown } = useActionsZIndex();
  return (
    <DropdownMenuContent
      ref={ref}
      variant={variant}
      style={{ zIndex: dropdown, ...style }}
      {...props}
    />
  );
});
ActionDropdownMenuContent.displayName = 'ActionDropdownMenuContent';

type ItemProps = React.ComponentPropsWithoutRef<typeof DropdownMenuItem>;
export const ActionDropdownMenuItem = forwardRef<
  React.ElementRef<typeof DropdownMenuItem>,
  ItemProps
>(({ variant = 'compact', ...props }, ref) => (
  <DropdownMenuItem ref={ref} variant={variant} {...props} />
));
ActionDropdownMenuItem.displayName = 'ActionDropdownMenuItem';
