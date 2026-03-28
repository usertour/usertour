import { cn } from '@usertour-packages/tailwind';
import { forwardRef, type HTMLAttributes } from 'react';

interface ResourceCenterAnchorProps extends HTMLAttributes<HTMLDivElement> {
  anchor?: React.ReactNode;
}

export const ResourceCenterAnchor = forwardRef<HTMLDivElement, ResourceCenterAnchorProps>(
  ({ anchor, children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('usertour-widget-resource-center', className)} {...props}>
        {children}
        {anchor}
      </div>
    );
  },
);

ResourceCenterAnchor.displayName = 'ResourceCenterAnchor';
