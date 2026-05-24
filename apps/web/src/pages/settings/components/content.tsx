import { cn } from '@usertour/tailwind';

/**
 * Padding wrapper used by Settings pages that don't yet use the new
 * `SettingsPage` primitive from `@usertour/ui`. New pages should reach
 * for `SettingsPage` (or `SettingsCardStack` + `SettingsCard`) directly.
 */
export const SettingsContent = (props: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { children, className = '' } = props;
  return <div className={cn('flex-1 grow space-y-6 px-4 py-6 lg:px-8', className)}>{children}</div>;
};

SettingsContent.displayName = 'SettingsContent';
