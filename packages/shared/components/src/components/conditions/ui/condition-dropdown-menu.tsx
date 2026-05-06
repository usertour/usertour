import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { forwardRef } from 'react';
import { useConditionsZIndex } from '../conditions-context';

// Conditions-specific DropdownMenu wrappers. The styling itself comes from
// the atomic DropdownMenu via `variant="compact"` — what we add here is the
// dropdown z-index pulled from ConditionsContext so menus stack correctly
// above the chip popovers that contain them. Without that injection the
// menu would render at Radix's default z-index and slip behind the parent
// popover at certain stacking depths.

export const ConditionDropdownMenu = DropdownMenu;
export const ConditionDropdownMenuTrigger = DropdownMenuTrigger;

type ContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuContent>;
export const ConditionDropdownMenuContent = forwardRef<
  React.ElementRef<typeof DropdownMenuContent>,
  ContentProps
>(({ variant = 'compact', style, ...props }, ref) => {
  const { dropdown } = useConditionsZIndex();
  return (
    <DropdownMenuContent
      ref={ref}
      variant={variant}
      style={{ zIndex: dropdown, ...style }}
      {...props}
    />
  );
});
ConditionDropdownMenuContent.displayName = 'ConditionDropdownMenuContent';

type ItemProps = React.ComponentPropsWithoutRef<typeof DropdownMenuItem>;
export const ConditionDropdownMenuItem = forwardRef<
  React.ElementRef<typeof DropdownMenuItem>,
  ItemProps
>(({ variant = 'compact', ...props }, ref) => (
  <DropdownMenuItem ref={ref} variant={variant} {...props} />
));
ConditionDropdownMenuItem.displayName = 'ConditionDropdownMenuItem';
