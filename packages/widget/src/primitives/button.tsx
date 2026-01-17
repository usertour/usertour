import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@usertour-packages/tailwind';

// Base styles for Widget button
const buttonBase = cn(
  'inline-flex items-center justify-center transition-colors',
  'outline-none focus-visible:ring-sdk-ring focus-visible:ring-[3px]',
  'disabled:pointer-events-none disabled:opacity-50',
  'font-sdk text-sdk-base rounded-sdk-button h-auto min-w-sdk-button px-sdk-button-x',
);

// Custom variant base styles (only accessibility, no layout/appearance)
const customVariantBase = cn(
  'outline-none focus-visible:ring-sdk-ring focus-visible:ring-[3px]',
  'disabled:pointer-events-none disabled:opacity-50',
);

const buttonVariants = cva(buttonBase, {
  variants: {
    variant: {
      default: cn(
        'bg-sdk-btn-primary text-sdk-btn-primary-foreground font-sdk-primary',
        'border-solid border-sdk-btn-primary', // Sets both border-width and border-color
        'hover:bg-sdk-btn-primary-hover hover:text-sdk-btn-primary-foreground-hover hover:border-sdk-btn-primary-hover',
        'active:bg-sdk-btn-primary-active active:text-sdk-btn-primary-foreground-active active:border-sdk-btn-primary-active',
        'usertour-btn--primary', // For calc() padding in CSS
      ),
      secondary: cn(
        'bg-sdk-btn-secondary text-sdk-btn-secondary-foreground font-sdk-secondary',
        'border-solid border-sdk-btn-secondary', // Sets both border-width and border-color
        'hover:bg-sdk-btn-secondary-hover hover:text-sdk-btn-secondary-foreground-hover hover:border-sdk-btn-secondary-hover',
        'active:bg-sdk-btn-secondary-active active:text-sdk-btn-secondary-foreground-active active:border-sdk-btn-secondary-active',
        'usertour-btn--secondary', // For calc() padding in CSS
      ),
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

type ButtonVariant = VariantProps<typeof buttonVariants>['variant'] | 'custom';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'variant'> {
  variant?: ButtonVariant;
  size?: VariantProps<typeof buttonVariants>['size'];
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    // Determine variant class names
    const variantClassName = React.useMemo(() => {
      if (variant === 'custom') {
        return customVariantBase;
      }
      // Only allow 'default' and 'secondary', undefined will use defaultVariants
      const validVariant = variant === 'default' || variant === 'secondary' ? variant : undefined;
      return buttonVariants({
        variant: validVariant,
        size,
      });
    }, [variant, size]);

    return <Comp className={cn(variantClassName, className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
