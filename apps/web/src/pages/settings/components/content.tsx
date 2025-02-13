import { cn } from '@usertour-ui/ui-utils';

export const SettingsContent = (props: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { children, className = '' } = props;
  return (
    <div className={cn('flex-1 space-y-6 px-4 py-6 lg:px-8  grow ', className)}>{children}</div>
  );
};

SettingsContent.displayName = 'SettingsContent';
