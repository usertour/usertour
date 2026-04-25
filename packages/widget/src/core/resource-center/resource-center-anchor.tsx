import { cn } from '@usertour-packages/tailwind';
import { forwardRef, type HTMLAttributes } from 'react';

export const ResourceCenterAnchor = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('usertour-widget-resource-center', className)} {...props}>
        {children}
      </div>
    );
  },
);

ResourceCenterAnchor.displayName = 'ResourceCenterAnchor';
