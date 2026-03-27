import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@usertour-packages/tailwind';

interface ResourceCenterAnchorProps extends HTMLAttributes<HTMLDivElement> {
  anchor?: React.ReactNode;
}

export const ResourceCenterAnchor = forwardRef<HTMLDivElement, ResourceCenterAnchorProps>(
  ({ anchor, children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('relative', className)} {...props}>
        <div className="relative">
          {children}
          {anchor}
        </div>
      </div>
    );
  },
);

ResourceCenterAnchor.displayName = 'ResourceCenterAnchor';
