import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@usertour/helpers';
import React, { useCallback, useRef } from 'react';
import { useRulesZIndex } from './rules-context';

const RulesPopover = PopoverPrimitive.Root;

const RulesPopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <PopoverPrimitive.Trigger ref={ref} asChild {...props}>
    <div className={cn('grow pr-6 text-sm  py-2 text-wrap	 break-all', className)}>{children}</div>
  </PopoverPrimitive.Trigger>
));

const RulesPopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(
  (
    {
      className,
      align = 'start',
      sideOffset = 5,
      alignOffset = -32,
      side = 'bottom',
      children,
      onFocusOutside,
      ...props
    },
    forwardedRef,
  ) => {
    const { popover: zIndex } = useRulesZIndex();

    // Prevent focus outside from closing the popover (e.g., when DropdownMenu closes)
    const handleFocusOutside: NonNullable<typeof onFocusOutside> = (e) => {
      e.preventDefault();
      onFocusOutside?.(e);
    };

    // Track if we've already focused to avoid stealing focus on re-renders
    const hasFocusedRef = useRef(false);

    // Focus the first input element only on initial mount
    // Don't reset on null - ref changes during re-render also call with null
    // When popover actually closes & reopens, component remounts with fresh ref
    const contentRef = useCallback((node: HTMLDivElement | null) => {
      if (node && !hasFocusedRef.current) {
        const firstInput = node.querySelector('input, textarea, select') as HTMLElement | null;
        firstInput?.focus();
        hasFocusedRef.current = true;
      }
    }, []);

    // Merge refs
    const mergedRef = useCallback(
      (node: HTMLDivElement | null) => {
        contentRef(node);
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [contentRef, forwardedRef],
    );

    return (
      <PopoverPrimitive.Content
        ref={mergedRef}
        align={align}
        side={side}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className={cn('border bg-popover rounded p-4 w-96', className)}
        style={{
          zIndex,
          filter:
            'drop-shadow(0 3px 10px rgba(0, 0, 0, 0.15)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
        }}
        onFocusOutside={handleFocusOutside}
        {...props}
      >
        {children}
        <PopoverPrimitive.Arrow className="fill-background" width={20} height={10} />
      </PopoverPrimitive.Content>
    );
  },
);

RulesPopoverContent.displayName = 'RulesPopoverContent';

export { RulesPopover, RulesPopoverContent, RulesPopoverTrigger };
