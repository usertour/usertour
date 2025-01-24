import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@usertour-ui/tooltip";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";

interface HelpTooltipProps {
  children: React.ReactNode;
}

export const HelpTooltip = ({ children }: HelpTooltipProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <QuestionMarkCircledIcon />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{children}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

HelpTooltip.displayName = "HelpTooltip";
