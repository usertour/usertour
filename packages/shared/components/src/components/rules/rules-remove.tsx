import { CloseIcon } from "@usertour-ui/icons";
import { useRulesGroupContext } from "../contexts/rules-group-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@usertour-ui/tooltip";

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
          <TooltipTrigger asChild>
            <CloseIcon
              width={18}
              height={18}
              className="absolute top-1 right-1 cursor-pointer"
              onClick={handleOnClick}
            />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-foreground text-background">
            Remove condition
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
};

RulesRemove.displayName = "RulesRemove";
