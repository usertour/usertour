import { TaskClickedIcon } from '@usertour-ui/icons';
import { RulesLogic } from './rules-logic';
import { RulesRemove } from './rules-remove';
import { RulesConditionIcon, RulesConditionRightContent } from './rules-template';
import { useRulesContext } from './rules-context';

export interface RulesTaskIsClickedProps {
  index: number;
  type: string;
  data?: any;
}

export const RulesTaskIsClicked = (props: RulesTaskIsClickedProps) => {
  const { index } = props;
  const { disabled } = useRulesContext();

  return (
    <div className="flex flex-row space-x-3">
      <RulesLogic index={index} disabled={disabled} />
      <RulesConditionRightContent className="items-center" disabled={disabled}>
        <RulesConditionIcon>
          <TaskClickedIcon width={16} height={16} />
        </RulesConditionIcon>
        <div className="grow pr-6 text-sm  ">Task is clicked</div>
        <RulesRemove index={index} />
      </RulesConditionRightContent>
    </div>
  );
};

RulesTaskIsClicked.displayName = 'RulesTaskIsClicked';
