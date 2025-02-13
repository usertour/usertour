import { cn } from '@usertour-ui/ui-utils';
import { ReactNode, forwardRef } from 'react';

type TemplateSharedProps = {
  children: ReactNode;
  className?: string;
};

export const RulesConditionIcon = forwardRef<HTMLDivElement, TemplateSharedProps>((props, ref) => {
  const { children } = props;
  return (
    <div
      className={cn('flex-none px-2 inline-flex items-center justify-center', props.className)}
      ref={ref}
    >
      {children}
    </div>
  );
});
RulesConditionIcon.displayName = 'RulesConditionIcon';

export const RulesConditionRightContent = forwardRef<HTMLDivElement, TemplateSharedProps>(
  (props, ref) => {
    const { children } = props;
    return (
      <div
        className={cn(
          'grow bg-muted rounded cursor-pointer flex flex-row relative hover:bg-secondary-hover',
          props.className,
        )}
        ref={ref}
      >
        {children}
      </div>
    );
  },
);
RulesConditionRightContent.displayName = 'RulesConditionRightContent';
