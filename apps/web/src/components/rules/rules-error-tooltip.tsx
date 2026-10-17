import { cn } from '@usertour/tailwind';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { forwardRef } from 'react';
import { ErrorTooltip, ErrorTooltipAnchor, ErrorTooltipContent } from '@usertour/ui';
import { useRulesZIndex } from './z-index';

// Re-export the open-state shell and the anchor — they don't need wrapping.
export const RulesErrorTooltip = ErrorTooltip;
export const RulesErrorTooltipAnchor = ErrorTooltipAnchor;

type ContentProps = ComponentPropsWithoutRef<typeof ErrorTooltipContent>;

// Wraps shared ErrorTooltipContent with the rules editors' defaults: text-sm (matches
// the 12px rhythm of chips, inputs, and inline-sentence rows — the shared
// default of text-sm reads two tiers too large in this context) and the
// rules z-index from context so the bubble stacks above the editor
// popover that owns it. zIndex prop still wins if a caller passes one.
export const RulesErrorTooltipContent = forwardRef<HTMLDivElement, ContentProps>(
  ({ className, children, zIndex, ...props }, ref) => {
    const { error: defaultZIndex } = useRulesZIndex();
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
RulesErrorTooltipContent.displayName = 'RulesErrorTooltipContent';
