import React, { type ReactNode } from 'react';
import { Button } from '@usertour/button';
import { RiAddLine } from '@usertour/icons';

export interface NewItemButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Localised button text — usually `t('…newButton')` from i18n. */
  label: ReactNode;
}

/**
 * The "+ New X" primary CTA pattern used on every list page (Settings →
 * themes / events / attributes / environments / localizations / API /
 * team, plus content list pages). Encodes:
 *
 * - The leading `+` icon (`RiAddLine`).
 * - A 4px gap between icon and label (`mr-1`) — tighter than the shadcn
 *   default to avoid the "icon floating away from the text" feel.
 * - 60% opacity on the icon so the label reads as the primary
 *   affordance and the icon stays supportive. Matches the Linear /
 *   modern-SaaS visual hierarchy referenced in the v0.8.2 audit.
 *
 * Adjustments to any of those happen here — never copy this className
 * combo across new call sites.
 */
export const NewItemButton = React.forwardRef<HTMLButtonElement, NewItemButtonProps>(
  (props, ref) => {
    const { label, ...rest } = props;
    return (
      <Button ref={ref} {...rest}>
        <RiAddLine className="mr-1 h-4 w-4 opacity-60" />
        {label}
      </Button>
    );
  },
);

NewItemButton.displayName = 'NewItemButton';
