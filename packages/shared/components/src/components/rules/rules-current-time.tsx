import { CalendarIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { Calendar } from '@usertour-packages/calendar';
import { TimeIcon } from '@usertour-packages/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { cn } from '@usertour/helpers';
import { format, parseISO } from 'date-fns';
import { ComboBox } from '@usertour-packages/combo-box';
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCurrentTimeError,
  isTimeConditionDataV2,
  isTimeConditionDataLegacy,
} from '@usertour/helpers';
import type { TimeConditionData, TimeConditionDataV2 } from '@usertour/types';
import { useRulesGroupContext } from '../contexts/rules-group-context';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesLogic } from './rules-logic';
import { RulesPopover, RulesPopoverContent, RulesPopoverTrigger } from './rules-popper';
import { RulesRemove } from './rules-remove';
import { RulesConditionIcon, RulesConditionRightContent } from './rules-template';
import { useRulesContext, useRulesZIndex } from './rules-context';

export interface RulesCurrentTimeProps {
  index: number;
  type: string;
  data?: TimeConditionData;
}

/**
 * Parse initial data from either new or legacy format
 */
const parseInitialData = (data?: TimeConditionData) => {
  if (!data) {
    return {
      startDate: undefined,
      endDate: undefined,
      startDateHour: '00',
      startDateMinute: '00',
      endDateHour: '00',
      endDateMinute: '00',
    };
  }

  // New format: ISO 8601
  if (isTimeConditionDataV2(data)) {
    const startDate = data.startTime ? parseISO(data.startTime) : undefined;
    const endDate = data.endTime ? parseISO(data.endTime) : undefined;

    return {
      startDate,
      endDate,
      startDateHour: startDate ? format(startDate, 'HH') : '00',
      startDateMinute: startDate ? format(startDate, 'mm') : '00',
      endDateHour: endDate ? format(endDate, 'HH') : '00',
      endDateMinute: endDate ? format(endDate, 'mm') : '00',
    };
  }

  // Legacy format: MM/dd/yyyy
  if (isTimeConditionDataLegacy(data)) {
    const parseLegacyDate = (dateStr?: string): Date | undefined => {
      if (!dateStr) {
        return undefined;
      }
      const [month, day, year] = dateStr.split('/');
      if (!month || !day || !year) {
        return undefined;
      }
      return new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day));
    };

    return {
      startDate: parseLegacyDate(data.startDate),
      endDate: parseLegacyDate(data.endDate),
      startDateHour: data.startDateHour ?? '00',
      startDateMinute: data.startDateMinute ?? '00',
      endDateHour: data.endDateHour ?? '00',
      endDateMinute: data.endDateMinute ?? '00',
    };
  }

  return {
    startDate: undefined,
    endDate: undefined,
    startDateHour: '00',
    startDateMinute: '00',
    endDateHour: '00',
    endDateMinute: '00',
  };
};

// Custom hook for time management
const useTimeState = (initialData?: TimeConditionData) => {
  const parsed = parseInitialData(initialData);

  const [startDate, setStartDate] = useState<Date | undefined>(parsed.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(parsed.endDate);
  const [startDateHour, setStartDateHour] = useState(parsed.startDateHour);
  const [startDateMinute, setStartDateMinute] = useState(parsed.startDateMinute);
  const [endDateHour, setEndDateHour] = useState(parsed.endDateHour);
  const [endDateMinute, setEndDateMinute] = useState(parsed.endDateMinute);

  const getTimeData = useCallback((): TimeConditionDataV2 => {
    if (!startDate) {
      return {};
    }

    // Build complete datetime objects
    const startDateTime = new Date(startDate);
    startDateTime.setHours(Number.parseInt(startDateHour), Number.parseInt(startDateMinute), 0, 0);

    const result: TimeConditionDataV2 = {
      startTime: startDateTime.toISOString(),
    };

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(Number.parseInt(endDateHour), Number.parseInt(endDateMinute), 0, 0);
      result.endTime = endDateTime.toISOString();
    }

    return result;
  }, [startDate, startDateHour, startDateMinute, endDate, endDateHour, endDateMinute]);

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
  const { popover: zIndex } = useRulesZIndex();

  return (
    <Popover>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" style={{ zIndex }} withoutPortal>
        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
      </PopoverContent>
    </Popover>
  );
};

// Time Selector Component
const RulesCurrentTimeTimer = (props: {
  num: number;
  defaultValue: string;
  onValueChange?(value: string): void;
}) => {
  const { num, defaultValue = '00', onValueChange } = props;
  const { combobox: zIndex } = useRulesZIndex();

  const options = useMemo(
    () =>
      Array.from({ length: num }, (_, i) => {
        const val = i.toString().padStart(2, '0');
        return { value: val, name: val };
      }),
    [num],
  );

  return (
    <ComboBox
      options={options}
      value={defaultValue}
      onValueChange={onValueChange || (() => {})}
      className="w-16 px-2"
      contentClassName="w-15 min-w-15"
      contentStyle={{ zIndex }}
    />
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
  const { error: errorZIndex } = useRulesZIndex();

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

      // Save in new format (ISO 8601)
      updateConditionData(index, timeData);
    },
    [
      getTimeData,
      index,
      updateConditionData,
      startDate,
      startDateHour,
      startDateMinute,
      endDate,
      endDateHour,
      endDateMinute,
    ],
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
        <RulesErrorContent zIndex={errorZIndex}>{errorInfo}</RulesErrorContent>
      </div>
    </RulesError>
  );
};

RulesCurrentTime.displayName = 'RulesCurrentTime';
