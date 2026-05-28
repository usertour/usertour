import React from 'react';
import { Button } from '../primitives/button';
import { SpinnerIcon } from '@usertour/icons';

export interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  children: React.ReactNode;
}

/**
 * Button with a leading spinner that takes over the disabled state while
 * `loading` is true. Saves every async submit site from re-implementing
 * the spinner + disabled toggle by hand.
 */
export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (props, ref) => {
    const { loading, disabled, children, ...rest } = props;
    return (
      <Button ref={ref} disabled={loading || disabled} {...rest}>
        {loading && <SpinnerIcon className="w-4 h-4 mr-2" />}
        {children}
      </Button>
    );
  },
);

LoadingButton.displayName = 'LoadingButton';
