import * as React from 'react';

import { cn } from '@usertour-packages/tailwind';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          // Base styles (text-sdk-base includes line-height)
          'h-9 w-full min-w-0 rounded-md border px-3 py-1 text-sdk-base shadow-xs transition-[color,box-shadow] outline-none',
          // SDK-specific colors
          'border-sdk-question bg-sdk-background text-sdk-question',
          'placeholder:text-sdk-foreground/50',
          // Focus states with SDK ring
          'focus-visible:border-sdk-question focus-visible:ring-sdk-ring focus-visible:ring-[3px]',
          // Disabled states
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          // File input styles
          'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-sdk-question',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
