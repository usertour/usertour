import { CaretSortIcon, CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-packages/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { RiFlashlightFill } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { cn } from '@usertour-packages/tailwind';
import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Event,
  EventConditionData,
  EventCountLogic,
  EventScope,
  EventTimeLogic,
  EventTimeUnit,
  RulesCondition,
} from '@usertour/types';
import { useRulesContext, useRulesZIndex } from './rules-context';
import { useRulesGroupContext } from '../contexts/rules-group-context';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesPopover, RulesPopoverContent } from './rules-popper';
import { RulesRemove } from './rules-remove';
import { RulesConditionRightContent } from './rules-template';
import { RulesPopoverTriggerWrapper } from './rules-wrapper';
import { useAutoOpenPopover } from './use-auto-open-popover';
import { RulesEventWhereGroup } from './rules-event-where';
import isEqual from 'fast-deep-equal';

// ============================================================================
// Constants
// ============================================================================

const countLogicOptions = [
  { value: EventCountLogic.AT_LEAST, name: 'at least' },
  { value: EventCountLogic.AT_MOST, name: 'at most' },
  { value: EventCountLogic.EXACTLY, name: 'exactly' },
  { value: EventCountLogic.BETWEEN, name: 'between' },
];

const timeLogicOptions = [
  { value: EventTimeLogic.IN_THE_LAST, name: 'in the last' },
  { value: EventTimeLogic.MORE_THAN, name: 'more than' },
  { value: EventTimeLogic.BETWEEN, name: 'between' },
  { value: EventTimeLogic.AT_ANY_POINT_IN_TIME, name: 'at any point in time' },
];

const timeUnitOptions = [
  { value: EventTimeUnit.SECONDS, name: 'seconds' },
  { value: EventTimeUnit.MINUTES, name: 'minutes' },
  { value: EventTimeUnit.HOURS, name: 'hours' },
  { value: EventTimeUnit.DAYS, name: 'days' },
];

const scopeOptions = [
  { value: EventScope.BY_CURRENT_USER_IN_ANY_COMPANY, name: 'by current user in any company' },
  {
    value: EventScope.BY_CURRENT_USER_IN_CURRENT_COMPANY,
    name: 'by current user in current company',
  },
  { value: EventScope.BY_ANY_USER_IN_CURRENT_COMPANY, name: 'by any user in current company' },
];

const DEFAULT_EVENT_DATA: EventConditionData = {
  countLogic: EventCountLogic.AT_LEAST,
  count: 1,
  timeLogic: EventTimeLogic.AT_ANY_POINT_IN_TIME,
  timeUnit: EventTimeUnit.DAYS,
  scope: EventScope.BY_CURRENT_USER_IN_ANY_COMPANY,
};

// ============================================================================
// Context
// ============================================================================

interface RulesEventContextValue {
  localData: EventConditionData;
  updateLocalData: (updates: Partial<EventConditionData>) => void;
  selectedEvent: Event | undefined;
  events: Event[];
  whereConditions: RulesCondition[];
  setWhereConditions: Dispatch<SetStateAction<RulesCondition[]>>;
}

const RulesEventContext = createContext<RulesEventContextValue | undefined>(undefined);

function useRulesEventContext(): RulesEventContextValue {
  const context = useContext(RulesEventContext);
  if (!context) {
    throw new Error('useRulesEventContext must be used within a RulesEventContext.');
  }
  return context;
}

// ============================================================================
// Sub-Components
// ============================================================================

const EventSelector = () => {
  const [open, setOpen] = useState(false);
  const { localData, updateLocalData, events, selectedEvent } = useRulesEventContext();
  const { popover: zIndex } = useRulesZIndex();

  const handleOnSelected = useCallback(
    (event: Event) => {
      updateLocalData({ eventId: event.id });
      setOpen(false);
    },
    [updateLocalData],
  );

  const handleFilter = useCallback(
    (value: string, search: string) => {
      const event = events.find((e) => e.id === value);
      if (
        event?.displayName.toLowerCase().includes(search.toLowerCase()) ||
        event?.codeName.toLowerCase().includes(search.toLowerCase())
      ) {
        return 1;
      }
      return 0;
    },
    [events],
  );

  return (
    <div className="flex flex-col space-y-1">
      <div>Event</div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex-1 justify-between">
            {selectedEvent?.displayName || selectedEvent?.codeName || 'Select event'}
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" style={{ zIndex }} withoutPortal>
          <Command filter={handleFilter}>
            <CommandInput placeholder="Search event..." />
            <CommandEmpty>No events found.</CommandEmpty>
            <ScrollArea className="h-72">
              <CommandGroup>
                {events.map((event) => (
                  <CommandItem
                    key={event.id}
                    className="cursor-pointer"
                    value={event.id}
                    onSelect={() => handleOnSelected(event)}
                  >
                    {event.displayName || event.codeName}
                    <CheckIcon
                      className={cn(
                        'ml-auto h-4 w-4',
                        localData.eventId === event.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const EventCountSelector = () => {
  const { localData, updateLocalData } = useRulesEventContext();
  const { dropdown: zIndex } = useRulesZIndex();

  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="text-primary h-auto p-0">
            <span>{countLogicOptions.find((o) => o.value === localData.countLogic)?.name}</span>
            <ChevronDownIcon width={16} height={16} className="ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" style={{ zIndex }}>
          <DropdownMenuRadioGroup
            value={localData.countLogic}
            onValueChange={(val) => updateLocalData({ countLogic: val as EventCountLogic })}
          >
            {countLogicOptions.map((o) => (
              <DropdownMenuRadioItem value={o.value} key={o.value}>
                {o.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Input
        type="number"
        min={0}
        value={localData.count ?? ''}
        onChange={(e) =>
          updateLocalData({ count: e.target.value ? Number(e.target.value) : undefined })
        }
        placeholder="0"
        className="w-16"
      />
      {localData.countLogic === EventCountLogic.BETWEEN && (
        <>
          <span className="text-sm">and</span>
          <Input
            type="number"
            min={0}
            value={localData.count2 ?? ''}
            onChange={(e) =>
              updateLocalData({ count2: e.target.value ? Number(e.target.value) : undefined })
            }
            placeholder="0"
            className="w-16"
          />
        </>
      )}
      <span className="text-sm text-muted-foreground">
        {(localData.count ?? 0) === 1 ? 'time' : 'times'}
      </span>
    </div>
  );
};

const EventTimeSelector = () => {
  const { localData, updateLocalData } = useRulesEventContext();
  const { dropdown: zIndex } = useRulesZIndex();
  const showTimeInputs = localData.timeLogic !== EventTimeLogic.AT_ANY_POINT_IN_TIME;

  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="text-primary h-auto p-0">
            <span>{timeLogicOptions.find((o) => o.value === localData.timeLogic)?.name}</span>
            <ChevronDownIcon width={16} height={16} className="ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" style={{ zIndex }}>
          <DropdownMenuRadioGroup
            value={localData.timeLogic}
            onValueChange={(val) => updateLocalData({ timeLogic: val as EventTimeLogic })}
          >
            {timeLogicOptions.map((o) => (
              <DropdownMenuRadioItem value={o.value} key={o.value}>
                {o.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {showTimeInputs && (
        <>
          <Input
            type="number"
            min={0}
            value={localData.windowValue ?? ''}
            onChange={(e) =>
              updateLocalData({
                windowValue: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            placeholder="0"
            className="w-16"
          />
          {localData.timeLogic === EventTimeLogic.BETWEEN && (
            <>
              <span className="text-sm">and</span>
              <Input
                type="number"
                min={0}
                value={localData.windowValue2 ?? ''}
                onChange={(e) =>
                  updateLocalData({
                    windowValue2: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="0"
                className="w-16"
              />
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-primary h-auto p-0">
                <span>{timeUnitOptions.find((o) => o.value === localData.timeUnit)?.name}</span>
                <ChevronDownIcon width={16} height={16} className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" style={{ zIndex }}>
              <DropdownMenuRadioGroup
                value={localData.timeUnit}
                onValueChange={(val) => updateLocalData({ timeUnit: val as EventTimeUnit })}
              >
                {timeUnitOptions.map((o) => (
                  <DropdownMenuRadioItem value={o.value} key={o.value}>
                    {o.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {localData.timeLogic === EventTimeLogic.MORE_THAN && (
            <span className="text-sm text-muted-foreground">ago</span>
          )}
        </>
      )}
    </div>
  );
};

const EventScopeSelector = () => {
  const { localData, updateLocalData } = useRulesEventContext();
  const { dropdown: zIndex } = useRulesZIndex();

  return (
    <div className="flex justify-start">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="text-primary h-auto !w-fit max-w-full justify-start p-0 text-left"
          >
            <span>{scopeOptions.find((o) => o.value === localData.scope)?.name}</span>
            <ChevronDownIcon width={16} height={16} className="ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" style={{ zIndex }}>
          <DropdownMenuRadioGroup
            value={localData.scope}
            onValueChange={(val) => updateLocalData({ scope: val as EventScope })}
          >
            {scopeOptions.map((o) => (
              <DropdownMenuRadioItem value={o.value} key={o.value}>
                {o.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// ============================================================================
// Summary
// ============================================================================

function buildSummary(
  data: EventConditionData,
  event: Event | undefined,
  whereConditions: RulesCondition[],
): string {
  if (!event || !data.eventId) {
    return 'Select event';
  }

  const eventName = event.displayName || event.codeName;
  const countLogicLabel = countLogicOptions.find((o) => o.value === data.countLogic)?.name ?? '';
  const count = data.count ?? 0;
  const timesStr = count === 1 ? 'time' : 'times';

  let summary = `${eventName} ${countLogicLabel} ${count}`;
  if (data.countLogic === EventCountLogic.BETWEEN) {
    summary += ` and ${data.count2 ?? 0}`;
  }
  summary += ` ${timesStr}`;

  // Time
  if (data.timeLogic === EventTimeLogic.AT_ANY_POINT_IN_TIME) {
    summary += ', at any point in time';
  } else {
    const timeLogicLabel = timeLogicOptions.find((o) => o.value === data.timeLogic)?.name ?? '';
    const unitLabel = timeUnitOptions.find((o) => o.value === data.timeUnit)?.name ?? '';

    if (data.timeLogic === EventTimeLogic.BETWEEN) {
      summary += `, ${timeLogicLabel} ${data.windowValue ?? 0} and ${data.windowValue2 ?? 0} ${unitLabel}`;
    } else if (data.timeLogic === EventTimeLogic.MORE_THAN) {
      summary += `, ${timeLogicLabel} ${data.windowValue ?? 0} ${unitLabel} ago`;
    } else {
      summary += `, ${timeLogicLabel} ${data.windowValue ?? 0} ${unitLabel}`;
    }
  }

  // Where conditions count
  if (whereConditions.length > 0) {
    summary += ` where ${whereConditions.length} condition${whereConditions.length > 1 ? 's' : ''}`;
  }

  return summary;
}

// ============================================================================
// Error Validation
// ============================================================================

export function getEventConditionError(data: EventConditionData | undefined): {
  showError: boolean;
  errorInfo: string;
} {
  const ret = { showError: false, errorInfo: '' };
  if (!data?.eventId) {
    ret.showError = true;
    ret.errorInfo = 'Please select an event';
    return ret;
  }
  if (data.count === undefined || data.count === null) {
    ret.showError = true;
    ret.errorInfo = 'Please enter a count value';
    return ret;
  }
  if (
    data.countLogic === EventCountLogic.BETWEEN &&
    (data.count2 === undefined || data.count2 === null)
  ) {
    ret.showError = true;
    ret.errorInfo = 'Please enter the second count value';
    return ret;
  }
  if (
    data.timeLogic !== EventTimeLogic.AT_ANY_POINT_IN_TIME &&
    (data.windowValue === undefined || data.windowValue === null)
  ) {
    ret.showError = true;
    ret.errorInfo = 'Please enter a time value';
    return ret;
  }
  if (
    data.timeLogic === EventTimeLogic.BETWEEN &&
    (data.windowValue2 === undefined || data.windowValue2 === null)
  ) {
    ret.showError = true;
    ret.errorInfo = 'Please enter the second time value';
    return ret;
  }
  return ret;
}

// ============================================================================
// Main Component
// ============================================================================

export interface RulesEventProps {
  index: number;
  type: string;
  data?: EventConditionData & { whereConditions?: RulesCondition[] };
  conditionId?: string;
}

export const RulesEvent = (props: RulesEventProps) => {
  const { index, data, conditionId } = props;
  const { events = [], disabled } = useRulesContext();
  const { error: errorZIndex } = useRulesZIndex();
  const { updateConditionData } = useRulesGroupContext();
  const [open, setOpen] = useAutoOpenPopover(conditionId);
  const [openError, setOpenError] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');

  const [localData, setLocalData] = useState<EventConditionData>(() => ({
    ...DEFAULT_EVENT_DATA,
    ...data,
  }));

  const [whereConditions, setWhereConditions] = useState<RulesCondition[]>(
    () => data?.whereConditions ?? [],
  );

  // Track the last-committed data to avoid saving when nothing changed
  const lastCommittedRef = useRef<Record<string, unknown>>({
    ...DEFAULT_EVENT_DATA,
    ...data,
    whereConditions: data?.whereConditions?.length ? data.whereConditions : undefined,
  });

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === localData.eventId),
    [events, localData.eventId],
  );

  const updateLocalData = useCallback((updates: Partial<EventConditionData>) => {
    setLocalData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Error checking
  useEffect(() => {
    if (open) {
      setOpenError(false);
      setErrorInfo('');
      return;
    }
    const { showError, errorInfo } = getEventConditionError(localData);
    if (showError) {
      setErrorInfo(errorInfo);
      setOpenError(true);
    } else {
      setErrorInfo('');
      setOpenError(false);
    }
  }, [localData, open]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen === open) {
        return;
      }
      setOpen(isOpen);
      if (isOpen) {
        setErrorInfo('');
        setOpenError(false);
        return;
      }
      const { showError, errorInfo } = getEventConditionError(localData);
      if (showError) {
        setErrorInfo(errorInfo);
        setOpenError(true);
        return;
      }
      const newData = {
        ...localData,
        whereConditions: whereConditions.length > 0 ? whereConditions : undefined,
      };
      // Only propagate if data actually changed from what was last committed
      if (!isEqual(newData, lastCommittedRef.current)) {
        lastCommittedRef.current = newData;
        updateConditionData(index, newData);
      }
    },
    [localData, open, whereConditions, index, updateConditionData],
  );

  const summary = useMemo(
    () => buildSummary(localData, selectedEvent, whereConditions),
    [localData, selectedEvent, whereConditions],
  );

  const contextValue = useMemo(
    () => ({
      localData,
      updateLocalData,
      selectedEvent,
      events,
      whereConditions,
      setWhereConditions,
    }),
    [localData, updateLocalData, selectedEvent, events, whereConditions],
  );
  const isErrorOpen = openError && Boolean(errorInfo);

  return (
    <RulesEventContext.Provider value={contextValue}>
      <RulesError open={isErrorOpen}>
        <RulesErrorAnchor asChild>
          <RulesConditionRightContent disabled={disabled}>
            <RulesPopover onOpenChange={handleOpenChange} open={open}>
              <RulesPopoverTriggerWrapper icon={<RiFlashlightFill size={16} />}>
                {summary}
              </RulesPopoverTriggerWrapper>
              <RulesPopoverContent className="w-[420px]">
                <div className="flex flex-col space-y-3">
                  <EventSelector />
                  {localData.eventId && (
                    <>
                      <EventCountSelector />
                      <EventTimeSelector />
                      <EventScopeSelector />
                      <RulesEventWhereGroup
                        eventId={localData.eventId}
                        conditions={whereConditions}
                        onChange={setWhereConditions}
                      />
                    </>
                  )}
                </div>
              </RulesPopoverContent>
            </RulesPopover>
            <RulesRemove index={index} />
          </RulesConditionRightContent>
        </RulesErrorAnchor>
        <RulesErrorContent zIndex={errorZIndex}>{errorInfo}</RulesErrorContent>
      </RulesError>
    </RulesEventContext.Provider>
  );
};

RulesEvent.displayName = 'RulesEvent';
