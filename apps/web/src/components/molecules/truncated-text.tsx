import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { cn } from '@usertour/helpers';

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  rawValue?: any; // Raw value to display in tooltip (e.g., original date value)
  showTooltip?: boolean; // Whether to show tooltip when text is truncated, default true
}

export const TruncatedText = ({
  text,
  maxLength = 20,
  className = '',
  rawValue,
  showTooltip = true,
}: TruncatedTextProps) => {
  const shouldTruncate = text.length > maxLength;
  const displayText = shouldTruncate ? `${text.slice(0, maxLength)}...` : text;
  const hasRawValue = rawValue !== undefined && rawValue !== null;

  // If text is not truncated and no rawValue, return simple span
  if (!shouldTruncate && !hasRawValue) {
    return <span className={className}>{text}</span>;
  }

  // If tooltip is disabled, return span without tooltip
  if (!showTooltip) {
    return <span className={className}>{displayText}</span>;
  }

  // Determine tooltip content: use rawValue if provided, otherwise use text
  const tooltipContent = hasRawValue ? String(rawValue) : text;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* className is placed last to allow users to override cursor-help if needed */}
          <span className={cn((shouldTruncate || hasRawValue) && 'cursor-help', className)}>
            {displayText}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs break-words">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
