// Inspired by react-hot-toast library
import React from 'react';
import * as sonner from 'sonner';

type ToastVariant = 'default' | 'success' | 'destructive' | 'warning';

interface ToastOptions {
  variant?: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

type IconProps = React.HTMLAttributes<SVGElement>;

// Common SVG props to reduce duplication
const commonSvgProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  width: '16',
  height: '16',
  fill: 'currentColor',
} as const;

export const SuccessIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => (
    <svg {...commonSvgProps} {...props} ref={forwardedRef}>
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM17.4571 9.45711L11 15.9142L6.79289 11.7071L8.20711 10.2929L11 13.0858L16.0429 8.04289L17.4571 9.45711Z" />
    </svg>
  ),
);

export const WarningIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => (
    <svg {...commonSvgProps} {...props} ref={forwardedRef}>
      <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 9.5C12.8284 9.5 13.5 8.82843 13.5 8C13.5 7.17157 12.8284 6.5 12 6.5C11.1716 6.5 10.5 7.17157 10.5 8C10.5 8.82843 11.1716 9.5 12 9.5ZM14 15H13V10.5H10V12.5H11V15H10V17H14V15Z" />
    </svg>
  ),
);

export const ErrorIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => (
    <svg {...commonSvgProps} {...props} ref={forwardedRef}>
      <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 10.5858L9.17157 7.75736L7.75736 9.17157L10.5858 12L7.75736 14.8284L9.17157 16.2426L12 13.4142L14.8284 16.2426L16.2426 14.8284L13.4142 12L16.2426 9.17157L14.8284 7.75736L12 10.5858Z" />
    </svg>
  ),
);

// Toast configuration mapping
const TOAST_CONFIG = {
  success: {
    method: sonner.toast.success,
    icon: <SuccessIcon className="text-success" />,
  },
  destructive: {
    method: sonner.toast.error,
    icon: <ErrorIcon className="text-destructive" />,
  },
  warning: {
    method: sonner.toast.warning,
    icon: <WarningIcon className="text-warning" />,
  },
  default: {
    method: sonner.toast,
    icon: undefined,
  },
} as const;

// Re-export Toaster for convenience
export const Toaster = sonner.Toaster;

function useToast() {
  const toast = React.useCallback((options: ToastOptions) => {
    const { variant = 'default', title, description, duration, action } = options;
    const config = TOAST_CONFIG[variant];

    const toastOptions: Parameters<typeof config.method>[1] = {
      description,
      duration,
      action,
    };

    // Add icon if available for the variant
    if (config.icon) {
      toastOptions.icon = config.icon;
    }

    config.method(title, toastOptions);
  }, []);

  // Convenience methods for common toast types
  const success = React.useCallback(
    (title: string, options?: Omit<ToastOptions, 'variant' | 'title'>) => {
      toast({ variant: 'success', title, ...options });
    },
    [toast],
  );

  const error = React.useCallback(
    (title: string, options?: Omit<ToastOptions, 'variant' | 'title'>) => {
      toast({ variant: 'destructive', title, ...options });
    },
    [toast],
  );

  const warning = React.useCallback(
    (title: string, options?: Omit<ToastOptions, 'variant' | 'title'>) => {
      toast({ variant: 'warning', title, ...options });
    },
    [toast],
  );

  const info = React.useCallback(
    (title: string, options?: Omit<ToastOptions, 'variant' | 'title'>) => {
      toast({ variant: 'default', title, ...options });
    },
    [toast],
  );

  return {
    toast,
    success,
    error,
    warning,
    info,
  };
}

export { useToast };
