import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Checkbox } from '@usertour-ui/checkbox';
import { Label } from '@usertour-ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { ContentDataType } from '@usertour-ui/types';
import { useId, useState } from 'react';

interface RulesIfCompletedProps {
  defaultValue: boolean;
  onCheckedChange: (checked: boolean) => void;
  contentType: ContentDataType;
  disabled?: boolean;
}

export const RulesIfCompleted = (props: RulesIfCompletedProps) => {
  const { defaultValue, onCheckedChange, contentType, disabled = false } = props;
  const [checked, setChecked] = useState(defaultValue);
  const id = useId();
  return (
    <div className="flex flex-row items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        className="data-[state=unchecked]:bg-input"
        onCheckedChange={(checked) => {
          const isChecked = checked === true;
          onCheckedChange(isChecked);
          setChecked(isChecked);
        }}
      />
      <Label htmlFor={id} className="flex flex-col space-y-1">
        <span className="font-normal">Only start if not complete</span>
      </Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <QuestionMarkCircledIcon />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-foreground text-background">
            If enabled, the {contentType} will only auto-start if the user has not completed it
            before.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

RulesIfCompleted.displayName = 'RulesIfCompleted';
