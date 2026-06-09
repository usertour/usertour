import { FlagIcon } from '@usertour/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour/ui';
import { useTranslation } from 'react-i18next';

export const GoalStepBadge = () => {
  const { t } = useTranslation();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="w-7 h-7 rounded-full flex justify-center items-center bg-success shrink-0">
            <FlagIcon className="w-5 h-5 text-background" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('contents.goalStep')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

GoalStepBadge.displayName = 'GoalStepBadge';
