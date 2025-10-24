import { cn } from '@usertour/helpers';
import { forwardRef, ReactNode } from 'react';
import { useRulesContext } from './rules-context';
import { RulesPopoverTrigger } from './rules-popper';

interface RulesWrapperProps {
  children: ReactNode;
  className?: string;
}

export const RulesContainerWrapper = forwardRef<HTMLDivElement, RulesWrapperProps>((props, ref) => {
  const { children, className } = props;
  const { isHorizontal } = useRulesContext();
  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-row ',
        isHorizontal ? 'mr-1 mb-1 space-x-1 ' : 'space-x-3',
        className,
      )}
    >
      {children}
    </div>
  );
});

RulesContainerWrapper.displayName = 'RulesContainerWrapper';

export const RulesPopoverTriggerWrapper = forwardRef<HTMLButtonElement, RulesWrapperProps>(
  (props, ref) => {
    const { children, className } = props;
    const { isHorizontal } = useRulesContext();
    return (
      <RulesPopoverTrigger className={cn(isHorizontal ? 'w-auto' : '', className)} ref={ref}>
        {children}
      </RulesPopoverTrigger>
    );
  },
);

RulesPopoverTriggerWrapper.displayName = 'RulesPopoverTriggerWrapper';
