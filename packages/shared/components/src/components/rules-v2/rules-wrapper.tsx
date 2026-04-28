import { cn } from '@usertour-packages/tailwind';
import { forwardRef, ReactNode } from 'react';
import { useRulesContext } from './rules-context';
import { RulesPopoverTrigger } from './rules-popper';

interface RulesWrapperProps {
  children: ReactNode;
  className?: string;
}

interface RulesPopoverTriggerWrapperProps extends RulesWrapperProps {
  icon?: ReactNode;
}

export const RulesContainerWrapper: React.FC<RulesWrapperProps> = ({ children, className }) => {
  return <div className={cn('flex flex-row space-x-3', className)}>{children}</div>;
};

RulesContainerWrapper.displayName = 'RulesContainerWrapper';

export const RulesPopoverTriggerWrapper = forwardRef<
  HTMLButtonElement,
  RulesPopoverTriggerWrapperProps
>((props, ref) => {
  const { children, className, icon } = props;
  const { isHorizontal } = useRulesContext();
  return (
    <RulesPopoverTrigger
      className={cn(isHorizontal ? 'w-auto' : '', className)}
      ref={ref}
      icon={icon}
    >
      {children}
    </RulesPopoverTrigger>
  );
});

RulesPopoverTriggerWrapper.displayName = 'RulesPopoverTriggerWrapper';
