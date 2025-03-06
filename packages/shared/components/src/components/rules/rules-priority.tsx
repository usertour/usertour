import { ChevronDownIcon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { ContentPriority } from '@usertour-ui/types';
import { useState } from 'react';

const itemsMapping = [
  { key: ContentPriority.HIGHEST, value: 'Highest priority' },
  { key: ContentPriority.HIGH, value: 'High priority' },
  { key: ContentPriority.MEDIUM, value: 'Medium priority' },
  { key: ContentPriority.LOW, value: 'Low priority' },
  { key: ContentPriority.LOWEST, value: 'Lowest priority' },
];

interface RulesPriorityProps {
  defaltValue: ContentPriority;
  onChange: (value: string) => void;
  disabled?: boolean;
}
export const RulesPriority = (props: RulesPriorityProps) => {
  const { defaltValue = ContentPriority.MEDIUM, onChange, disabled = false } = props;
  const [value, setValue] = useState(defaltValue);

  const handleOnValueChange = (value: string) => {
    setValue(value as ContentPriority);
    onChange(value as ContentPriority);
  };
  return (
    <div className="flex flex-row items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <div className="flex flex-row items-center space-x-2 text-sm text-primary cursor-pointer w-fit">
            <span>{itemsMapping.find((item) => item.key === value)?.value}</span>
            <ChevronDownIcon width={16} height={16} />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={value} onValueChange={handleOnValueChange}>
            {itemsMapping.map((item) => (
              <DropdownMenuRadioItem value={item.key} key={item.key}>
                {item.value}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <QuestionMarkCircledIcon />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-foreground text-background">
            <p>
              if a user matches start conditions for 2 contents, the one with the higher
              prioritywill be started. Choose a high priority for your most important content
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

RulesPriority.displayName = 'RulesPriority';
