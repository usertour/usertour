import { Button } from '@usertour-ui/button';
import { Tabs, TabsList, TabsTrigger } from '@usertour-ui/tabs';
import { cn } from '@usertour-ui/ui-utils';
import { useRulesContext } from './rules-context';
import { useRulesGroupContext } from '../contexts/rules-group-context';

type RulesLogicProps = {
  index: number;
  disabled?: boolean;
};
export const RulesLogic = (props: RulesLogicProps) => {
  const { index, disabled = false } = props;
  const { conditionType, setConditionType } = useRulesGroupContext();
  const { isHorizontal, isShowIf } = useRulesContext();

  const className1 = isHorizontal ? 'w-1/2 h-auto' : 'w-1/2 h-6';
  if (index === 0 && isShowIf) {
    return (
      <Button
        variant="secondary"
        disabled={disabled}
        className={cn('flex-none py-2 w-[88px]', isHorizontal ? 'h-auto' : 'h-7')}
      >
        If
      </Button>
    );
  }
  if (disabled) {
    return (
      <Tabs className="h-auto flex-none">
        <TabsList className="h-auto  w-[88px]">
          <TabsTrigger value="and" className={className1} disabled={true}>
            and
          </TabsTrigger>
          <TabsTrigger value="or" className={className1} disabled={true}>
            or
          </TabsTrigger>
        </TabsList>
      </Tabs>
    );
  }

  return (
    <>
      <Tabs
        className="h-auto flex-none"
        defaultValue={conditionType}
        value={conditionType}
        onValueChange={(value: string) => {
          if (value === 'or' || value === 'and') {
            setConditionType(value);
          }
        }}
      >
        <TabsList className="h-auto  w-[88px]">
          <TabsTrigger value="and" className={className1}>
            and
          </TabsTrigger>
          <TabsTrigger value="or" className={className1}>
            or
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </>
  );
};

RulesLogic.displayName = 'RulesLogic';
