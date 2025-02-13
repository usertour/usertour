import { CloseIcon } from '@usertour-ui/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { useActionsGroupContext } from '../contexts/actions-group-context';

type ContentActionsRemoveProps = {
  index: number;
};
export const ContentActionsRemove = (props: ContentActionsRemoveProps) => {
  const { index } = props;
  const { conditions, setNewConditions } = useActionsGroupContext();

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
            Remove action
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
};

ContentActionsRemove.displayName = 'ContentActionsRemove';
