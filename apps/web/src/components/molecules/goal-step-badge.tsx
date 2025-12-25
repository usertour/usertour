import { FlagIcon } from '@usertour-packages/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';

export const GoalStepBadge = () => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="w-7 h-7 rounded-full flex justify-center items-center bg-success shrink-0">
            <FlagIcon className="w-5 h-5 text-background" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Goal step</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

GoalStepBadge.displayName = 'GoalStepBadge';
