import { TaskClickedIcon, TimeIcon } from "@usertour-ui/icons";
import { Calendar } from "@usertour-ui/calendar";
import * as Popover from "@usertour-ui/popover";
import { format } from "date-fns";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { CalendarIcon, TrackPreviousIcon } from "@radix-ui/react-icons";
import { cn } from "@usertour-ui/ui-utils";
import { RulesLogic } from "./rules-logic";
import { RulesRemove } from "./rules-remove";
import {
  RulesConditionIcon,
  RulesConditionRightContent,
} from "./rules-template";

export interface RulesTaskIsClickedProps {
  index: number;
  type: string;
  data?: {};
}

export const RulesTaskIsClicked = (props: RulesTaskIsClickedProps) => {
  const { index } = props;

  return (
    <div className="flex flex-row space-x-3">
      <RulesLogic index={index} />
      <RulesConditionRightContent className="items-center">
        <RulesConditionIcon>
          <TaskClickedIcon width={16} height={16} />
        </RulesConditionIcon>
        <div className="grow pr-6 text-sm  ">Task is clicked</div>
        <RulesRemove index={index} />
      </RulesConditionRightContent>
    </div>
  );
};

RulesTaskIsClicked.displayName = "RulesTaskIsClicked";
