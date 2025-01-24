import { ChangeEvent, useState } from "react";
import { Input } from "@usertour-ui/input";
import { RulesError, RulesErrorAnchor, RulesErrorContent } from "./rules-error";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@usertour-ui/tooltip";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";

export interface RulesCurrentTimeProps {
  defaultValue: number;
  onValueChange: (value: number) => void;
  maxSeconds?: number;
}

export const RulesWait = (props: RulesCurrentTimeProps) => {
  const { defaultValue, onValueChange, maxSeconds = 300 } = props;
  const [openError, setOpenError] = useState(false);
  const [inputValue, setInputValue] = useState<number>(defaultValue ?? 0);

  const handleInputOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setInputValue(value);
    if (value > maxSeconds) {
      setOpenError(true);
    } else {
      onValueChange(value);
      setOpenError(false);
    }
  };

  return (
    <RulesError open={openError}>
      <div className="flex flex-row space-x-3">
        <div className="flex flex-row items-center space-x-2 h-9 space-x-2 items-center">
          <span className="text-sm">Wait</span>
          <RulesErrorAnchor asChild>
            <Input
              type="text"
              name={"Border width"}
              onChange={handleInputOnChange}
              value={inputValue}
              className="rounded-lg text-sm w-16 h-6 "
              placeholder={""}
            />
          </RulesErrorAnchor>
          <div className="text-muted-foreground text-sm">
            second before starting
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <QuestionMarkCircledIcon className="ml-1 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                Condition must stay true while waiting
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <RulesErrorContent className="w-60">
          Wait time must not be greater than {maxSeconds} seconds (
          {Math.floor(maxSeconds / 60)} minutes)
        </RulesErrorContent>
      </div>
    </RulesError>
  );
};

RulesWait.displayName = "RulesWait";
