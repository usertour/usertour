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
const sdkButtonBase = cn(
  'inline-flex items-center justify-center transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  'disabled:pointer-events-none disabled:opacity-50',
  'font-sdk text-sdk-base rounded-sdk-button h-auto min-w-sdk-button px-sdk-button-x',
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
      custom: cn(
        // Only accessibility styles, no layout/appearance
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
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

type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
type SdkButtonVariant = VariantProps<typeof buttonVariantsForSdk>['variant'];
type ButtonSize = VariantProps<typeof buttonVariants>['size'];

// Valid SDK button variants
const SDK_VARIANTS: readonly SdkButtonVariant[] = ['default', 'secondary', 'custom'] as const;

// Valid regular button variants
const REGULAR_VARIANTS: readonly ButtonVariant[] = [
  'default',
  'destructive',
  'outline',
  'secondary',
  'ghost',
  'link',
] as const;

// Type guard to check if variant is valid for SDK buttons
const isSdkVariant = (
  variant: ButtonVariant | SdkButtonVariant | undefined,
): variant is SdkButtonVariant => {
  return !variant || SDK_VARIANTS.includes(variant as SdkButtonVariant);
};

// Type guard to check if variant is valid for regular buttons
const isRegularVariant = (
  variant: ButtonVariant | SdkButtonVariant | undefined,
): variant is ButtonVariant => {
  return !variant || REGULAR_VARIANTS.includes(variant as ButtonVariant);
};

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'variant'> {
  variant?: ButtonVariant | SdkButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  forSdk?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, forSdk = false, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    // Determine variant class names based on forSdk flag
    const variantClassName = React.useMemo(() => {
      if (forSdk) {
        // Validate variant for SDK buttons
        if (variant && !isSdkVariant(variant)) {
          console.warn(
            `Invalid variant "${variant}" for SDK button. Using default variant. Valid variants: ${SDK_VARIANTS.join(', ')}`,
          );
          return buttonVariantsForSdk({ variant: 'default', size });
        }
        return buttonVariantsForSdk({ variant: variant as SdkButtonVariant, size });
      }

      // Validate variant for regular buttons
      if (variant && !isRegularVariant(variant)) {
        console.warn(
          `Invalid variant "${variant}" for regular button. Using default variant. Valid variants: ${REGULAR_VARIANTS.join(', ')}`,
        );
        return buttonVariants({ variant: 'default', size });
      }
      return buttonVariants({ variant: variant as ButtonVariant, size });
    }, [variant, size, forSdk]);

    return <Comp className={cn(variantClassName, className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
