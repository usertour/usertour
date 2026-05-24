import type { ReactNode } from 'react';
import { cn } from '@usertour/tailwind';

export interface SettingsCardProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Page-width form card used by Settings pages that render a stack of
 * independent forms (account, project general). Soft triple-shadow only
 * — no visible border per the design system.
 */
export const SettingsCard = ({ className, children }: SettingsCardProps) => {
  return (
    <div
      className={cn(
        'mx-auto w-full min-w-[750px] max-w-3xl rounded-xl bg-background p-6 lg:p-8',
        'shadow-sm shadow-foreground/[0.06] ring-1 ring-foreground/[0.03]',
        className,
      )}
    >
      {children}
    </div>
  );
};

SettingsCard.displayName = 'SettingsCard';
