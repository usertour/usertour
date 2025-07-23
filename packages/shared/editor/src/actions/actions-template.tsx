import { cn } from '@usertour-packages/utils';
import { ReactNode, forwardRef } from 'react';

type TemplateSharedProps = {
  children: ReactNode;
  className?: string;
};

export const ContentActionsConditionIcon = forwardRef<HTMLDivElement, TemplateSharedProps>(
  (props, ref) => {
    const { children, className } = props;
    return (
      <div
        className={cn('flex-none px-2 inline-flex items-center justify-center', className)}
        ref={ref}
      >
        {children}
      </div>
    );
  },
);
ContentActionsConditionIcon.displayName = 'ContentActionsConditionIcon';

export const ActionsConditionRightContent = forwardRef<HTMLDivElement, TemplateSharedProps>(
  (props, ref) => {
    const { children, className } = props;
    return (
      <div
        className={cn(
          'bg-secondary-hover hover:bg-secondary-hover/80 rounded cursor-pointer flex flex-row relative ',
          className,
        )}
        ref={ref}
      >
        {children}
      </div>
    );
  },
);
ActionsConditionRightContent.displayName = 'ActionsConditionRightContent';
