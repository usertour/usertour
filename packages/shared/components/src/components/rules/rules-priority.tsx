import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { ContentPriority } from '@usertour/types';
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
          <Button variant="ghost" className="text-primary h-auto p-0">
            <span>{itemsMapping.find((item) => item.key === value)?.value}</span>
            <ChevronDownIcon width={16} height={16} className="ml-2" />
          </Button>
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
      <QuestionTooltip>
        if a user matches start conditions for 2 contents, the one with the higher priority will be
        started. Choose a high priority for your most important content
      </QuestionTooltip>
    </div>
  );
};

RulesPriority.displayName = 'RulesPriority';
