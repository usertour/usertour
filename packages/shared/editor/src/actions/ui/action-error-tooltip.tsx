import { cn } from '@usertour-packages/tailwind';
import {
  ErrorTooltip,
  ErrorTooltipAnchor,
  ErrorTooltipContent,
} from '@usertour-packages/shared-components';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { forwardRef } from 'react';
import { useActionsZIndex } from '../actions-context';

// Mirrors conditions/ui/condition-error-tooltip.tsx. Re-exports the
// open-state shell and the anchor unchanged and wraps the content with
// actions-context z-index so the bubble stacks above the editor popover
// that owns it. zIndex prop still wins if a caller passes one.
export const ActionErrorTooltip = ErrorTooltip;
export const ActionErrorTooltipAnchor = ErrorTooltipAnchor;

type ContentProps = ComponentPropsWithoutRef<typeof ErrorTooltipContent>;

export const ActionErrorTooltipContent = forwardRef<HTMLDivElement, ContentProps>(
  ({ className, children, zIndex, ...props }, ref) => {
    const { error: defaultZIndex } = useActionsZIndex();
    return (
      <ErrorTooltipContent
        ref={ref}
        className={cn('text-sm', className)}
        zIndex={zIndex ?? defaultZIndex}
        {...props}
      >
        {children as ReactNode}
      </ErrorTooltipContent>
    );
  },
);
ActionErrorTooltipContent.displayName = 'ActionErrorTooltipContent';
