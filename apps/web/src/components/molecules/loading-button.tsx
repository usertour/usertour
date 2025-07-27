import React from 'react';
import { Button } from '@usertour-packages/button';
import { SpinnerIcon } from '@usertour-packages/icons';

// Button component with loading state
export const LoadingButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    children: React.ReactNode;
  }
>(({ loading, children, ...props }, ref) => (
  <Button ref={ref} disabled={loading} {...props}>
    {loading && <SpinnerIcon className="w-4 h-4 mr-2" />}
    {children}
  </Button>
));

LoadingButton.displayName = 'LoadingButton';
