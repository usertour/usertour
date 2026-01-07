import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@usertour-packages/tailwind';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive-hover',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-4 py-2',
        sm: 'h-7 rounded-md px-3',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

// Base styles for SDK button
// Note: Don't use cn() here as tailwind-merge incorrectly merges custom border classes
const sdkButtonBase = [
  'inline-flex items-center justify-center transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  'disabled:pointer-events-none disabled:opacity-50',
  'font-sdk text-sdk-base rounded-sdk-button h-auto min-w-sdk-button px-sdk-button-x',
].join(' ');

const buttonVariantsForSdk = cva(sdkButtonBase, {
  variants: {
    variant: {
      default: [
        'bg-sdk-btn-primary text-sdk-btn-primary-foreground font-sdk-primary',
        'border-solid border-sdk-btn-primary', // Sets both border-width and border-color
        'hover:bg-sdk-btn-primary-hover hover:text-sdk-btn-primary-foreground-hover hover:border-sdk-btn-primary-hover',
        'active:bg-sdk-btn-primary-active active:text-sdk-btn-primary-foreground-active active:border-sdk-btn-primary-active',
        'usertour-btn--primary', // For calc() padding in CSS
      ].join(' '),
      secondary: [
        'bg-sdk-btn-secondary text-sdk-btn-secondary-foreground font-sdk-secondary',
        'border-solid border-sdk-btn-secondary', // Sets both border-width and border-color
        'hover:bg-sdk-btn-secondary-hover hover:text-sdk-btn-secondary-foreground-hover hover:border-sdk-btn-secondary-hover',
        'active:bg-sdk-btn-secondary-active active:text-sdk-btn-secondary-foreground-active active:border-sdk-btn-secondary-active',
        'usertour-btn--secondary', // For calc() padding in CSS
      ].join(' '),
    },
    size: {
      default: '',
      sm: '',
      lg: '',
      icon: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  forSdk?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, forSdk = false, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    // For SDK: Don't use cn() as tailwind-merge incorrectly merges custom border classes
    // For non-SDK: Use cn() to properly merge className with variants
    const variantClassName = forSdk
      ? buttonVariantsForSdk({
          variant: variant as 'default' | 'secondary',
          size,
          className,
        })
      : cn(buttonVariants({ variant, size }), className);
    return <Comp className={variantClassName} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
