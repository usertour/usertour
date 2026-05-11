import { cn } from '@usertour-packages/tailwind';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { forwardRef } from 'react';
import { ErrorTooltip, ErrorTooltipAnchor, ErrorTooltipContent } from '../../error-tooltip';
import { useConditionsZIndex } from '../conditions-context';

// Re-export the open-state shell and the anchor — they don't need wrapping.
export const ConditionErrorTooltip = ErrorTooltip;
export const ConditionErrorTooltipAnchor = ErrorTooltipAnchor;

type ContentProps = ComponentPropsWithoutRef<typeof ErrorTooltipContent>;

// Wraps shared ErrorTooltipContent with conditions defaults: text-sm (matches
// the 12px rhythm of chips, inputs, and inline-sentence rows — the shared
// default of text-sm reads two tiers too large in this context) and the
// conditions z-index from context so the bubble stacks above the editor
// popover that owns it. zIndex prop still wins if a caller passes one.
export const ConditionErrorTooltipContent = forwardRef<HTMLDivElement, ContentProps>(
  ({ className, children, zIndex, ...props }, ref) => {
    const { error: defaultZIndex } = useConditionsZIndex();
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
ConditionErrorTooltipContent.displayName = 'ConditionErrorTooltipContent';
