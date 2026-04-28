import { CloseIcon } from '@usertour-packages/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { useRulesGroupContext } from '../contexts/rules-group-context';

type RulesRemoveProps = {
  index: number;
};
export const RulesRemove = (props: RulesRemoveProps) => {
  const { index } = props;
  const { conditions, setNewConditions } = useRulesGroupContext();

  const handleOnClick = () => {
    const _conditions = [...conditions];
    _conditions.splice(index, 1);
    setNewConditions(_conditions);
  };
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="absolute top-1 right-1 cursor-pointer" onClick={handleOnClick}>
            <CloseIcon width={18} height={18} />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-foreground text-background">
            Remove condition
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
};

RulesRemove.displayName = 'RulesRemove';
