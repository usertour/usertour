import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  rawValue?: any; // Raw value to display in tooltip (e.g., original date value)
}

export const TruncatedText = ({
  text,
  maxLength = 20,
  className = '',
  rawValue,
}: TruncatedTextProps) => {
  const shouldTruncate = text.length > maxLength;
  const displayText = shouldTruncate ? `${text.slice(0, maxLength)}...` : text;
  const hasRawValue = rawValue !== undefined && rawValue !== null;

  // If text is not truncated and no rawValue, return simple span
  if (!shouldTruncate && !hasRawValue) {
    return <span className={className}>{text}</span>;
  }

  // Determine tooltip content: use rawValue if provided, otherwise use text
  const tooltipContent = hasRawValue ? String(rawValue) : text;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${className} ${shouldTruncate || hasRawValue ? 'cursor-help' : ''}`}>
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
