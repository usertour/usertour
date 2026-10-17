import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour/ui';
import { forwardRef } from 'react';
import { useRulesZIndex } from './z-index';

// DropdownMenu wrappers for the rules editors. The styling itself comes from
// the atomic DropdownMenu via `variant="compact"` — what we add here is the
// dropdown z-index pulled from the rules context so menus stack correctly
// above the chip popovers that contain them. Without that injection the
// menu would render at Radix's default z-index and slip behind the parent
// popover at certain stacking depths.

export const RulesDropdownMenu = DropdownMenu;
export const RulesDropdownMenuTrigger = DropdownMenuTrigger;

type ContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuContent>;
export const RulesDropdownMenuContent = forwardRef<
  React.ElementRef<typeof DropdownMenuContent>,
  ContentProps
>(({ variant = 'compact', style, ...props }, ref) => {
  const { dropdown } = useRulesZIndex();
  return (
    <DropdownMenuContent
      ref={ref}
      variant={variant}
      style={{ zIndex: dropdown, ...style }}
      {...props}
    />
  );
});
RulesDropdownMenuContent.displayName = 'RulesDropdownMenuContent';

type ItemProps = React.ComponentPropsWithoutRef<typeof DropdownMenuItem>;
export const RulesDropdownMenuItem = forwardRef<
  React.ElementRef<typeof DropdownMenuItem>,
  ItemProps
>(({ size = 'compact', ...props }, ref) => <DropdownMenuItem ref={ref} size={size} {...props} />);
RulesDropdownMenuItem.displayName = 'RulesDropdownMenuItem';
