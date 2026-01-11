import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@usertour-packages/tailwind';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50',
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
const sdkButtonBase = cn(
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

const buttonVariantsForSdk = cva(sdkButtonBase, {
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
      // Note: custom variant is handled separately in Button component to avoid inheriting sdkButtonBase
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
  forSdk?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, forSdk = false, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    // Determine variant class names based on forSdk flag
    const variantClassName = React.useMemo(() => {
      if (forSdk) {
        if (variant === 'custom') {
          return customVariantBase;
        }
        // Only allow 'default' and 'secondary' for SDK buttons, undefined will use defaultVariants
        const sdkVariant = variant === 'default' || variant === 'secondary' ? variant : undefined;
        return buttonVariantsForSdk({
          variant: sdkVariant,
          size,
        });
      }

      // For regular buttons, exclude 'custom' and let cva handle invalid values with defaultVariants
      return buttonVariants({ variant: variant as Exclude<ButtonVariant, 'custom'>, size });
    }, [variant, size, forSdk]);

    return <Comp className={cn(variantClassName, className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
