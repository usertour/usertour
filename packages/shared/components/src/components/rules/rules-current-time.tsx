import { CalendarIcon } from '@radix-ui/react-icons';
import { Calendar } from '@usertour-ui/calendar';
import { TimeIcon } from '@usertour-ui/icons';
import * as Popover from '@usertour-ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-ui/select';
import { cn } from '@usertour-ui/ui-utils';
import { format } from 'date-fns';
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';

import { Button } from '@usertour-ui/button';
import { EXTENSION_CONTENT_RULES } from '@usertour-ui/constants';
import { ScrollArea } from '@usertour-ui/scroll-area';
import { getCurrentTimeError } from '@usertour-ui/shared-utils';
import { useRulesGroupContext } from '../contexts/rules-group-context';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesLogic } from './rules-logic';
import { RulesPopover, RulesPopoverContent, RulesPopoverTrigger } from './rules-popper';
import { RulesRemove } from './rules-remove';
import { RulesConditionIcon, RulesConditionRightContent } from './rules-template';
import { useRulesContext } from './rules-context';

// Types
export interface TimeData {
  startDate: string;
  startDateHour: string;
  startDateMinute: string;
  endDate: string;
  endDateHour: string;
  endDateMinute: string;
}

export interface RulesCurrentTimeProps {
  index: number;
  type: string;
  data?: TimeData;
}

// Custom hook for time management
const useTimeState = (initialData?: TimeData) => {
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialData?.startDate ? new Date(initialData.startDate) : undefined,
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialData?.endDate ? new Date(initialData.endDate) : undefined,
  );
  const [startDateHour, setStartDateHour] = useState(initialData?.startDateHour ?? '00');
  const [startDateMinute, setStartDateMinute] = useState(initialData?.startDateMinute ?? '00');
  const [endDateHour, setEndDateHour] = useState(initialData?.endDateHour ?? '00');
  const [endDateMinute, setEndDateMinute] = useState(initialData?.endDateMinute ?? '00');

  const getTimeData = useCallback(
    (): TimeData => ({
      startDate: startDate ? format(startDate, 'MM/dd/yyyy') : '',
      startDateHour,
      startDateMinute,
      endDate: endDate ? format(endDate, 'MM/dd/yyyy') : '',
      endDateHour,
      endDateMinute,
    }),
    [startDate, startDateHour, startDateMinute, endDate, endDateHour, endDateMinute],
  );

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    startDateHour,
    setStartDateHour,
    startDateMinute,
    setStartDateMinute,
    endDateHour,
    setEndDateHour,
    endDateMinute,
    setEndDateMinute,
    getTimeData,
  };
};

// Date Picker Component
const RulesCurrentTimeDatePicker = (props: {
  date: Date | undefined;
  setDate: Dispatch<SetStateAction<Date | undefined>>;
}) => {
  const { date, setDate } = props;

  return (
    <Popover.Popover>
      <Popover.PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-[240px] justify-start text-left font-normal h-9',
            !date && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP') : <span>Pick a date</span>}
        </Button>
      </Popover.PopoverTrigger>
      <Popover.PopoverContent
        className="w-auto p-0"
        align="start"
        style={{ zIndex: EXTENSION_CONTENT_RULES }}
      >
        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
      </Popover.PopoverContent>
    </Popover.Popover>
  );
};

// Time Selector Component
const RulesCurrentTimeTimer = (props: {
  num: number;
  defaultValue: string;
  onValueChange?(value: string): void;
}) => {
  const { num, defaultValue = '00', onValueChange } = props;
  const items = Array.from({ length: num }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <Select defaultValue={defaultValue} onValueChange={onValueChange}>
      <SelectTrigger className="w-16">
        <SelectValue className="text-left" />
      </SelectTrigger>
      <SelectPortal>
        <SelectContent className="w-16 min-w-16" style={{ zIndex: EXTENSION_CONTENT_RULES }}>
          <ScrollArea className="h-60">
            {items.map((item) => (
              <SelectItem key={item} value={item} className="cursor-pointer">
                {item}
              </SelectItem>
            ))}
          </ScrollArea>
        </SelectContent>
      </SelectPortal>
    </Select>
  );
};

// Main Component
export const RulesCurrentTime = (props: RulesCurrentTimeProps) => {
  const { index, data } = props;
  const [openError, setOpenError] = useState(false);
  const [open, setOpen] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  const { updateConditionData } = useRulesGroupContext();
  const { disabled } = useRulesContext();

  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    startDateHour,
    setStartDateHour,
    startDateMinute,
    setStartDateMinute,
    endDateHour,
    setEndDateHour,
    endDateMinute,
    setEndDateMinute,
    getTimeData,
  } = useTimeState(data);

  useEffect(() => {
    const timeData = getTimeData();
    const { showError, errorInfo } = getCurrentTimeError(timeData);
    if (showError && !open) {
      setErrorInfo(errorInfo);
      setOpenError(true);
    }
  }, [getTimeData, open]);

  const handleOnOpenChange = useCallback(
    (open: boolean) => {
      setOpen(open);
      if (open) {
        setErrorInfo('');
        setOpenError(false);
        return;
      }

      const timeData = getTimeData();
      const { showError, errorInfo } = getCurrentTimeError(timeData);
      if (showError) {
        setErrorInfo(errorInfo);
        setOpenError(true);
        return;
      }

      updateConditionData(index, timeData);
    },
    [getTimeData, index, updateConditionData],
  );

  return (
    <RulesError open={openError}>
      <div className="flex flex-row space-x-3">
        <RulesLogic index={index} disabled={disabled} />
        <RulesErrorAnchor asChild>
          <RulesConditionRightContent disabled={disabled}>
            <RulesConditionIcon>
              <TimeIcon width={16} height={16} />
            </RulesConditionIcon>
            <RulesPopover onOpenChange={handleOnOpenChange} open={open}>
              <RulesPopoverTrigger>
                <div className="grow pr-6 text-sm text-wrap break-all">
                  Current time is {endDate ? 'between' : 'after'}{' '}
                  {startDate && (
                    <span className="font-bold">
                      {`${format(startDate, 'PPP')}, ${startDateHour}:${startDateMinute}`}
                    </span>
                  )}
                  {endDate && ' and '}
                  {endDate && (
                    <span className="font-bold">
                      {`${format(endDate, 'PPP')}, ${endDateHour}:${endDateMinute}`}
                    </span>
                  )}
                </div>
              </RulesPopoverTrigger>
              <RulesPopoverContent>
                <div className="flex flex-col space-y-1">
                  <div>Start time</div>
                  <div className="flex flex-row space-x-2 items-center">
                    <RulesCurrentTimeDatePicker date={startDate} setDate={setStartDate} />
                    <RulesCurrentTimeTimer
                      num={24}
                      defaultValue={startDateHour}
                      onValueChange={setStartDateHour}
                    />
                    <span>:</span>
                    <RulesCurrentTimeTimer
                      num={60}
                      defaultValue={startDateMinute}
                      onValueChange={setStartDateMinute}
                    />
                  </div>
                  <div>End time</div>
                  <div className="flex flex-row space-x-2 items-center">
                    <RulesCurrentTimeDatePicker date={endDate} setDate={setEndDate} />
                    <RulesCurrentTimeTimer
                      num={24}
                      defaultValue={endDateHour}
                      onValueChange={setEndDateHour}
                    />
                    <span>:</span>
                    <RulesCurrentTimeTimer
                      num={60}
                      defaultValue={endDateMinute}
                      onValueChange={setEndDateMinute}
                    />
                  </div>
                </div>
              </RulesPopoverContent>
            </RulesPopover>
            <RulesRemove index={index} />
          </RulesConditionRightContent>
        </RulesErrorAnchor>
        <RulesErrorContent>{errorInfo}</RulesErrorContent>
      </div>
    </RulesError>
  );
};

RulesCurrentTime.displayName = 'RulesCurrentTime';
