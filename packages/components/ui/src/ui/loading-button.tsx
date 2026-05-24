import React from 'react';
import { Button } from '@usertour/button';
import { SpinnerIcon } from '@usertour/icons';

/**
 * Button with a leading spinner that takes over the disabled state while
 * `loading` is true. Saves every async submit site from re-implementing
 * the spinner + disabled toggle by hand.
 */
export const LoadingButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    children: React.ReactNode;
  }
>(({ loading, disabled, children, ...props }, ref) => (
  <Button ref={ref} disabled={loading || disabled} {...props}>
    {loading && <SpinnerIcon className="w-4 h-4 mr-2" />}
    {children}
  </Button>
));

LoadingButton.displayName = 'LoadingButton';
