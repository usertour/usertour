import { CalendarIcon, CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { Calendar } from '@usertour-packages/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-packages/command';
import { CloseIcon, RiFlashlightFill } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { cn } from '@usertour-packages/tailwind';
import { isUndefined } from '@usertour/helpers';
import { format } from 'date-fns';
import { SelectPopover } from '../common/select-popover';
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
  Attribute,
  AttributeBizTypes,
  AttributeDataType,
  EventAttrConditionData,
} from '@usertour/types';
import { useListAttributeOnEventsQuery } from '@usertour-packages/shared-hooks';
import { useRulesContext, useRulesZIndex } from './rules-context';
import { useRulesGroupContext } from '../contexts/rules-group-context';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesPopover, RulesPopoverContent } from './rules-popper';
import { RulesRemove } from './rules-remove';
import { RulesConditionRightContent } from './rules-template';
import { RulesPopoverTriggerWrapper } from './rules-wrapper';
import { useAutoOpenPopover } from './use-auto-open-popover';
import { conditionsTypeMapping } from './rules-user-attribute';

// ============================================================================
// Context
// ============================================================================

interface RulesEventAttributeContextValue {
  selectedPreset: Attribute | null;
  setSelectedPreset: Dispatch<SetStateAction<Attribute | null>>;
  activeConditionMapping: (typeof conditionsTypeMapping)[AttributeDataType.Number];
  localData: EventAttrConditionData | undefined;
  updateLocalData: (updates: Partial<EventAttrConditionData>) => void;
  eventAttributes: Attribute[];
}

const RulesEventAttributeContext = createContext<RulesEventAttributeContextValue | undefined>(
  undefined,
);

function useRulesEventAttributeContext(): RulesEventAttributeContextValue {
  const context = useContext(RulesEventAttributeContext);
  if (!context) {
    throw new Error(
      'useRulesEventAttributeContext must be used within a RulesEventAttributeContext.',
    );
  }
  return context;
}

// ============================================================================
// Sub-Components
// ============================================================================

const EventAttributeName = () => {
  const [open, setOpen] = useState(false);
  const { selectedPreset, setSelectedPreset, updateLocalData, eventAttributes } =
    useRulesEventAttributeContext();
  const { popover: zIndex } = useRulesZIndex();

  const handleOnSelected = useCallback(
    (item: Attribute) => {
      setSelectedPreset(item);
      updateLocalData({ attrId: item.id });
      setOpen(false);
    },
    [setSelectedPreset, updateLocalData],
  );

  const handleFilter = useCallback(
    (value: string, search: string) => {
      const attribute = eventAttributes.find((attr) => attr.id === value);
      if (
        attribute?.displayName.toLowerCase().includes(search.toLowerCase()) ||
        attribute?.codeName.toLowerCase().includes(search.toLowerCase())
      ) {
        return 1;
      }
      return 0;
    },
    [eventAttributes],
  );

  return (
    <div className="flex flex-row">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex-1 justify-between">
            {selectedPreset?.displayName || selectedPreset?.codeName || 'Select attribute...'}
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" style={{ zIndex }} withoutPortal>
          <Command filter={handleFilter}>
            <CommandInput placeholder="Search attribute..." />
            <CommandEmpty>No matching attributes</CommandEmpty>
            <ScrollArea className="h-72">
              <CommandGroup heading="Event attribute">
                {eventAttributes.map((item) => (
                  <CommandItem
                    key={item.id}
                    className="cursor-pointer"
                    value={item.id}
                    onSelect={() => handleOnSelected(item)}
                  >
                    {item.displayName || item.codeName}
                    <CheckIcon
                      className={cn(
                        'ml-auto h-4 w-4',
                        selectedPreset?.id === item.id ? 'opacity-100' : 'opacity-0',
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

const EventAttributeCondition = () => {
  const { localData, updateLocalData, activeConditionMapping } = useRulesEventAttributeContext();
  const { combobox: zIndex } = useRulesZIndex();

  const handleConditionChange = useCallback(
    (value: string) => {
      updateLocalData({ logic: value });
    },
    [updateLocalData],
  );

  return (
    <SelectPopover
      options={activeConditionMapping || []}
      value={localData?.logic}
      onValueChange={handleConditionChange}
      placeholder="Select condition"
      contentStyle={{ zIndex }}
    />
  );
};

const RulesEventAttributeDatePicker = (props: {
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
            'w-full justify-start text-left font-normal h-9',
            !date && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'yyyy-MM-dd') : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" style={{ zIndex }} withoutPortal>
        <Calendar
          mode="single"
          defaultMonth={date}
          selected={date}
          onSelect={setDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

const EventAttributeInput = () => {
  const { localData, updateLocalData, selectedPreset } = useRulesEventAttributeContext();
  const isDateTime =
    selectedPreset?.dataType === AttributeDataType.DateTime &&
    (localData?.logic === 'on' || localData?.logic === 'after' || localData?.logic === 'before');
  const [startDate, setStartDate] = useState<Date | undefined>(
    localData?.value && isDateTime ? new Date(localData.value) : undefined,
  );

  const [inputType, setInputType] = useState<string>('');
  const [listValues, setListValues] = useState<string[]>(['']);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  useEffect(() => {
    if (selectedPreset?.dataType === AttributeDataType.Number) {
      setInputType('number');
    } else {
      setInputType('text');
    }
  }, [selectedPreset]);

  useEffect(() => {
    if (selectedPreset?.dataType === AttributeDataType.List) {
      if (localData?.listValues) {
        setListValues([...localData.listValues, '']);
      } else {
        setListValues(['']);
      }
    }
  }, [selectedPreset?.dataType, localData?.listValues]);

  const handleListValueChange = (index: number, value: string) => {
    const newValues = [...listValues];
    newValues[index] = value;
    if (value && index === newValues.length - 1) {
      newValues.push('');
    }
    setListValues(newValues);
    const validValues = newValues.filter(Boolean);
    updateLocalData({ listValues: validValues.length > 0 ? validValues : [] });
  };

  const handleRemoveListValue = (index: number) => {
    if (listValues.length === 1) {
      setListValues(['']);
      updateLocalData({ listValues: [] });
    } else {
      const newValues = listValues.filter((_, i) => i !== index);
      if (!newValues[newValues.length - 1]) {
        newValues.push('');
      }
      setListValues(newValues);
      const validValues = newValues.filter(Boolean);
      updateLocalData({ listValues: validValues.length > 0 ? validValues : [] });
    }
  };

  const prevDataTypeRef = useRef<AttributeDataType | undefined>(selectedPreset?.dataType);
  const prevIsDateTimeRef = useRef<boolean>(isDateTime);

  useEffect(() => {
    const shouldClearValue =
      (!isUndefined(prevDataTypeRef.current) &&
        selectedPreset?.dataType !== prevDataTypeRef.current) ||
      (selectedPreset?.dataType === AttributeDataType.DateTime &&
        prevIsDateTimeRef.current !== isDateTime);

    if (shouldClearValue) {
      updateLocalData({ value: '' });
    }

    prevDataTypeRef.current = selectedPreset?.dataType;
    prevIsDateTimeRef.current = isDateTime;
  }, [selectedPreset?.dataType, isDateTime, updateLocalData]);

  useEffect(() => {
    if (isDateTime) {
      try {
        updateLocalData({
          value: startDate ? format(startDate, 'yyyy-MM-dd') : '',
        });
      } catch (_) {
        updateLocalData({ value: '' });
      }
    }
  }, [startDate, isDateTime, updateLocalData]);

  if (!selectedPreset) return null;

  // No input for boolean, any, empty
  if (
    selectedPreset.dataType === AttributeDataType.Boolean ||
    localData?.logic === 'any' ||
    localData?.logic === 'empty'
  ) {
    return null;
  }

  // List type

  if (isDateTime) {
    return (
      <div className="flex flex-row space-x-4 items-center">
        <RulesEventAttributeDatePicker date={startDate} setDate={setStartDate} />
      </div>
    );
  }
  if (selectedPreset.dataType === AttributeDataType.List) {
    return (
      <div className="flex flex-col space-y-2">
        {listValues.map((value, index) => (
          <div key={index} className="relative">
            <Input
              value={value || ''}
              onChange={(e) => handleListValueChange(index, e.target.value)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(-1)}
              autoFocus={index === focusedIndex}
              placeholder="Enter new value"
              className="pr-8"
            />
            {(value || index !== listValues.length - 1) && (
              <Button
                variant={'ghost'}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-0 w-8"
                onClick={() => handleRemoveListValue(index)}
              >
                <CloseIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-row space-x-4 items-center">
      <Input
        type={inputType}
        value={localData?.value || ''}
        onChange={(e) => updateLocalData({ value: e.target.value })}
        placeholder=""
      />
      {localData?.logic === 'between' && (
        <>
          <span>and</span>
          <Input
            type={inputType}
            value={localData?.value2 || ''}
            onChange={(e) => updateLocalData({ value2: e.target.value })}
            placeholder=""
          />
        </>
      )}
    </div>
  );
};

// ============================================================================
// Error Validation
// ============================================================================

export function getEventAttrError(
  data: EventAttrConditionData | undefined,
  eventAttributes: Attribute[],
): { showError: boolean; errorInfo: string } {
  const ret = { showError: false, errorInfo: '' };
  const item = eventAttributes.find((attr) => attr.id === data?.attrId);
  if (!data?.attrId || !item) {
    ret.showError = true;
    ret.errorInfo = 'Please select an event attribute';
  } else if (data?.logic === 'between' && (!data?.value || !data?.value2)) {
    ret.showError = true;
    ret.errorInfo = 'Please enter a value';
  } else if (item?.dataType !== AttributeDataType.Boolean) {
    if (data.logic !== 'any' && data.logic !== 'empty') {
      if (item?.dataType === AttributeDataType.List) {
        if (!data.listValues || data.listValues.length === 0) {
          ret.showError = true;
          ret.errorInfo = 'Please enter a value';
        }
      } else {
        if (!data.value || data.value === '') {
          ret.showError = true;
          ret.errorInfo = 'Please enter a value';
        }
      }
    }
  }
  return ret;
}

// ============================================================================
// Main Component
// ============================================================================

export interface RulesEventAttributeProps {
  index: number;
  type: string;
  data?: EventAttrConditionData;
  conditionId?: string;
  eventId: string;
}

export const RulesEventAttribute = (props: RulesEventAttributeProps) => {
  const { index, data, conditionId, eventId } = props;
  const { attributes, disabled } = useRulesContext();
  const { error: errorZIndex } = useRulesZIndex();
  const { updateConditionData } = useRulesGroupContext();
  const [open, setOpen] = useAutoOpenPopover(conditionId);
  const [openError, setOpenError] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');

  const [selectedPreset, setSelectedPreset] = useState<Attribute | null>(null);
  const [localData, setLocalData] = useState<EventAttrConditionData | undefined>(data);

  // Fetch event-specific attributes
  const { attributeOnEvents: attrOnEvents } = useListAttributeOnEventsQuery(eventId);

  const eventAttributes = useMemo(() => {
    if (!attrOnEvents || !attributes) return [];
    const attrIds = new Set(attrOnEvents.map((aoe) => aoe.attributeId));
    return attributes.filter(
      (attr) => attrIds.has(attr.id) && attr.bizType === AttributeBizTypes.Event,
    );
  }, [attrOnEvents, attributes]);

  const [activeConditionMapping, setActiveConditionMapping] = useState<
    (typeof conditionsTypeMapping)[AttributeDataType.Number]
  >(conditionsTypeMapping[AttributeDataType.String]);

  const [displayCondition, setDisplayCondition] = useState<string>('');
  const [displayValue, setDisplayValue] = useState<string>('');

  // Initialize selected preset from data
  useEffect(() => {
    if (eventAttributes.length > 0 && data?.attrId) {
      const item = eventAttributes.find((attr) => attr.id === data.attrId);
      if (item) {
        setSelectedPreset(item);
      }
    }
  }, [eventAttributes, data?.attrId]);

  const updateLocalData = useCallback((updates: Partial<EventAttrConditionData>) => {
    setLocalData((prev) => (prev ? { ...prev, ...updates } : { ...updates }));
  }, []);

  // Update condition mapping when preset changes
  useEffect(() => {
    if (selectedPreset?.dataType) {
      const t = selectedPreset.dataType as keyof typeof conditionsTypeMapping;
      if (conditionsTypeMapping[t]) {
        setActiveConditionMapping(conditionsTypeMapping[t]);
      }
    }
  }, [selectedPreset]);

  // Update display condition
  useEffect(() => {
    if (activeConditionMapping && activeConditionMapping.length > 0) {
      const mapping = activeConditionMapping.find((c) => c.value === localData?.logic);
      if (mapping) {
        setDisplayCondition(mapping.name);
      } else {
        setDisplayCondition(activeConditionMapping[0].name);
      }
    }
  }, [activeConditionMapping, localData?.logic]);

  // Update display value
  useEffect(() => {
    const shouldClearDisplay =
      localData?.logic === 'empty' ||
      localData?.logic === 'any' ||
      selectedPreset?.dataType === AttributeDataType.Boolean;

    if (shouldClearDisplay) {
      setDisplayValue('');
      return;
    }

    if (localData?.listValues && selectedPreset?.dataType === AttributeDataType.List) {
      setDisplayValue(localData.listValues.join(','));
      return;
    }

    setDisplayValue(localData?.value || '');
  }, [localData, selectedPreset]);

  // Error checking
  useEffect(() => {
    if (open) {
      setOpenError(false);
      setErrorInfo('');
      return;
    }
    const { showError, errorInfo } = getEventAttrError(localData, eventAttributes);
    if (showError) {
      setErrorInfo(errorInfo);
      setOpenError(true);
    } else {
      setErrorInfo('');
      setOpenError(false);
    }
  }, [localData, eventAttributes, open]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        setErrorInfo('');
        setOpenError(false);
        return;
      }
      const { showError, errorInfo } = getEventAttrError(localData, eventAttributes);
      if (showError) {
        setErrorInfo(errorInfo);
        setOpenError(true);
        return;
      }
      updateConditionData(index, { ...localData });
    },
    [localData, eventAttributes, index, updateConditionData],
  );

  const contextValue = useMemo(
    () => ({
      selectedPreset,
      setSelectedPreset,
      activeConditionMapping,
      localData,
      updateLocalData,
      eventAttributes,
    }),
    [selectedPreset, activeConditionMapping, localData, updateLocalData, eventAttributes],
  );

  return (
    <RulesEventAttributeContext.Provider value={contextValue}>
      <RulesError open={openError}>
        <RulesErrorAnchor asChild>
          <RulesConditionRightContent disabled={disabled}>
            <RulesPopover onOpenChange={handleOpenChange} open={open}>
              <RulesPopoverTriggerWrapper icon={<RiFlashlightFill size={16} />}>
                <span className="font-bold">{selectedPreset?.displayName} </span>
                {displayCondition} <span className="font-bold">{displayValue}</span>
                {localData?.logic === 'between' && (
                  <>
                    <span className="mx-1">and</span>
                    <span className="font-bold">{localData?.value2}</span>
                  </>
                )}
              </RulesPopoverTriggerWrapper>
              <RulesPopoverContent>
                <div className="flex flex-col space-y-2">
                  <div className="flex flex-col space-y-1">
                    <div>Attribute</div>
                    <EventAttributeName />
                    <EventAttributeCondition />
                    <EventAttributeInput />
                  </div>
                </div>
              </RulesPopoverContent>
            </RulesPopover>
            <RulesRemove index={index} />
          </RulesConditionRightContent>
        </RulesErrorAnchor>
        <RulesErrorContent zIndex={errorZIndex}>{errorInfo}</RulesErrorContent>
      </RulesError>
    </RulesEventAttributeContext.Provider>
  );
};

RulesEventAttribute.displayName = 'RulesEventAttribute';
