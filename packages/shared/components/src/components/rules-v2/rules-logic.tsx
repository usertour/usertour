import { Button } from '@usertour-packages/button';
import { Tabs, TabsList, TabsTrigger } from '@usertour-packages/tabs';
import { cn } from '@usertour-packages/tailwind';
import { memo, useCallback } from 'react';
import { useRulesContext } from './rules-context';
import { useRulesGroupContext } from '../contexts/rules-group-context';

// Style constants
const TABS_CLASS = 'h-auto flex-none';
const TABS_LIST_CLASS = 'h-auto w-20 p-1';

type ConditionType = 'and' | 'or';

interface RulesLogicProps {
  index: number;
  disabled?: boolean;
}

// Logic tabs component for and/or selection
interface LogicTabsProps {
  value?: ConditionType;
  onChange?: (value: ConditionType) => void;
  disabled?: boolean;
  triggerClassName: string;
}

const LogicTabs = memo(({ value, onChange, disabled, triggerClassName }: LogicTabsProps) => {
  const handleValueChange = useCallback(
    (newValue: string) => {
      if (newValue === 'and' || newValue === 'or') {
        onChange?.(newValue);
      }
    },
    [onChange],
  );

  return (
    <Tabs
      className={TABS_CLASS}
      defaultValue={value}
      value={value}
      onValueChange={disabled ? undefined : handleValueChange}
    >
      <TabsList className={TABS_LIST_CLASS}>
        <TabsTrigger value="and" className={triggerClassName} disabled={disabled}>
          and
        </TabsTrigger>
        <TabsTrigger value="or" className={triggerClassName} disabled={disabled}>
          or
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
});

LogicTabs.displayName = 'LogicTabs';

export const RulesLogic = memo((props: RulesLogicProps) => {
  const { index, disabled = false } = props;
  const { conditionType, setConditionType } = useRulesGroupContext();
  const { isHorizontal, isShowIf } = useRulesContext();

  const triggerClassName = cn('w-1/2 h-auto px-2', isHorizontal ? 'py-1' : 'py-0.5');

  // First condition with "If" button
  if (index === 0 && isShowIf) {
    return (
      <Button
        variant="secondary"
        disabled={disabled}
        className={cn('flex-none w-20', isHorizontal ? 'h-9 py-2' : 'h-6 py-1')}
      >
        If
      </Button>
    );
  }

  // First condition without "If" - render nothing
  if (index === 0) {
    return null;
  }

  // Subsequent conditions - render and/or tabs
  return (
    <LogicTabs
      value={conditionType}
      onChange={setConditionType}
      disabled={disabled}
      triggerClassName={triggerClassName}
    />
  );
});

RulesLogic.displayName = 'RulesLogic';
