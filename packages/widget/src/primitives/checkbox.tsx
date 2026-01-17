'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { CheckIcon } from '@radix-ui/react-icons';
import * as React from 'react';

import { cn } from '@usertour-packages/tailwind';

export type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>;

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        // Base styles
        'peer h-4 w-4 shrink-0 rounded-sm border shadow',
        // SDK-specific colors
        'border-sdk-question',
        // Focus states with SDK ring
        'focus-visible:outline-none focus-visible:ring-sdk-ring focus-visible:ring-[3px]',
        // Checked state with SDK colors
        'data-[state=checked]:bg-sdk-question data-[state=checked]:text-sdk-background',
        // Disabled states
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className={cn('flex items-center justify-center text-current')}>
        <CheckIcon className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  ),
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
