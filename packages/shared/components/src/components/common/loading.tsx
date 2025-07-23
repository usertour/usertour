import { cn } from '@usertour/helpers';
import { ReactNode } from 'react';

interface LoadingContainerProps {
  children: ReactNode;
  className?: string;
}
export const LoadingContainer = (props: LoadingContainerProps) => {
  const { children, className } = props;
  return (
    <div className={cn('fixed inset-0 z-[100000] bg-background/10 backdrop-blur-sm', className)}>
      <div
        className="
        fixed left-[50%] top-[50%] z-[100001] translate-x-[-50%] translate-y-[-50%]  "
      >
        {children}
      </div>
    </div>
  );
};

LoadingContainer.displayName = 'LoadingContainer';
