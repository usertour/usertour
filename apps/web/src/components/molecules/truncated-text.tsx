import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

export const TruncatedText = ({ text, maxLength = 20, className = '' }: TruncatedTextProps) => {
  const shouldTruncate = text.length > maxLength;
  const displayText = shouldTruncate ? `${text.slice(0, maxLength)}...` : text;

  if (!shouldTruncate) {
    return <span className={className}>{text}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${className} cursor-help`} title={text}>
            {displayText}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs break-words">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
