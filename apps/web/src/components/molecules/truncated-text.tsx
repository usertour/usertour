import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { cn } from '@usertour-packages/tailwind';

interface TruncatedTextProps {
  text: string;
  className?: string;
  rawValue?: any; // Raw value to display in tooltip (e.g., original date value)
  showTooltip?: boolean; // Whether to show tooltip when text is truncated, default true
}

export const TruncatedText = ({
  text,
  className = '',
  rawValue,
  showTooltip = true,
}: TruncatedTextProps) => {
  const hasRawValue = rawValue !== undefined && rawValue !== null;

  // Determine tooltip content: use rawValue if provided, otherwise use text
  const tooltipContent = hasRawValue ? String(rawValue) : text;

  if (!showTooltip && !hasRawValue) {
    return <span className={cn('truncate', className)}>{text}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* className is placed last to allow users to override cursor-help if needed */}
          <span className={cn('truncate cursor-help', className)}>{text}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs break-words">{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
