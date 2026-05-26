import type { ReactNode } from 'react';
import { cn } from '@usertour/tailwind';

export interface SettingsCardStackProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Vertical container for one or more `SettingsCard`s. Used by Settings
 * pages whose content is a stack of independent forms (account, project
 * general).
 */
export const SettingsCardStack = (props: SettingsCardStackProps) => {
  const { className, children } = props;
  return <div className={cn('flex flex-col grow space-y-8 py-8', className)}>{children}</div>;
};

SettingsCardStack.displayName = 'SettingsCardStack';
