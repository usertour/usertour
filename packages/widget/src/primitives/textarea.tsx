import * as React from 'react';

import { cn } from '@usertour-packages/tailwind';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Base styles
          'flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sdk-base shadow-sm',
          'transition-[color,box-shadow] outline-none',
          // SDK-specific colors
          'border-sdk-question bg-sdk-background text-sdk-question',
          'placeholder:text-sdk-foreground/50',
          // Focus states with SDK ring
          'focus-visible:border-sdk-question focus-visible:ring-sdk-ring focus-visible:ring-[3px]',
          // Disabled states
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
