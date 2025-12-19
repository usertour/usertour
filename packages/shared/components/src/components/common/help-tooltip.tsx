import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';

interface HelpTooltipProps {
  children: React.ReactNode;
}

export const HelpTooltip = ({ children }: HelpTooltipProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <QuestionMarkCircledIcon className="cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{children}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

HelpTooltip.displayName = 'HelpTooltip';
