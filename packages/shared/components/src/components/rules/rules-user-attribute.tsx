import { CalendarIcon, CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { CloseIcon, UserIcon } from '@usertour-ui/icons';
import { Input } from '@usertour-ui/input';
// import * as Popover from "@radix-ui/react-popover";
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
import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { Button } from '@usertour-ui/button';
import { Calendar } from '@usertour-ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-ui/command';
import { EXTENSION_CONTENT_RULES } from '@usertour-ui/constants';
import { ScrollArea } from '@usertour-ui/scroll-area';
import { getUserAttrError } from '@usertour-ui/shared-utils';
import {
  Attribute,
  AttributeBizTypes,
  AttributeDataType,
  RulesUserAttributeData,
  RulesUserAttributeProps,
} from '@usertour-ui/types';
import { useRulesContext } from './rules-context';
import { useRulesGroupContext } from '../contexts/rules-group-context';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesLogic } from './rules-logic';
import { RulesPopover, RulesPopoverContent, RulesPopoverTrigger } from './rules-popper';
import { RulesRemove } from './rules-remove';
import { RulesConditionIcon, RulesConditionRightContent } from './rules-template';

export const conditionsTypeMapping = {
  [AttributeDataType.Number]: [
    { value: 'is', name: 'is' },
    { value: 'not', name: 'is not' },
    { value: 'isLessThan', name: 'is less than' },
    { value: 'isLessThanOrEqualTo', name: 'is less than or equal to' },
    { value: 'isGreaterThan', name: 'is greater than' },
    { value: 'isGreaterThanOrEqualTo', name: 'is greater than or equal to' },
    { value: 'between', name: 'is between' },
    { value: 'any', name: 'has any value' },
    { value: 'empty', name: 'is empty' },
  ],
  [AttributeDataType.String]: [
    { value: 'is', name: 'is' },
    { value: 'not', name: 'is not' },
    { value: 'contains', name: 'contains' },
    { value: 'notContain', name: 'does not contain' },
    { value: 'startsWith', name: 'starts with' },
    { value: 'endsWith', name: 'ends with' },
    { value: 'any', name: 'has any value' },
    { value: 'empty', name: 'is empty' },
  ],
  [AttributeDataType.Boolean]: [
    { value: 'true', name: 'is true' },
    { value: 'false', name: 'is false' },
    { value: 'any', name: 'has any value' },
    { value: 'empty', name: 'is empty' },
  ],
  [AttributeDataType.List]: [
    { value: 'includesAtLeastOne', name: 'includes at least one of' },
    { value: 'includesAll', name: 'includes all of' },
    {
      value: 'notIncludesAtLeastOne',
      name: 'does not include at least one of',
    },
    { value: 'notIncludesAll', name: 'does not include all of' },
    { value: 'any', name: 'has any value' },
    { value: 'empty', name: 'is empty' },
  ],
  [AttributeDataType.DateTime]: [
    { value: 'lessThan', name: 'less than', display: 'less than ... days ago' },
    { value: 'exactly', name: 'exactly', display: 'exactly ... days ago' },
    { value: 'moreThan', name: 'more than', display: 'more than ... days ago' },
    { value: 'before', name: 'before', display: 'before a specific date' },
    { value: 'on', name: 'on', display: 'on a specific date' },
    { value: 'after', name: 'after', display: 'after a specific date' },
    { value: 'any', name: 'has any value' },
    { value: 'empty', name: 'is empty' },
  ],
};

interface RulesUserAttributeContextValue {
  type: string;
  selectedPreset: Attribute | null;
  setSelectedPreset: Dispatch<SetStateAction<Attribute | null>>;
  activeConditionMapping: (typeof conditionsTypeMapping)[AttributeDataType.DateTime];
  setActiveConditionMapping: Dispatch<
    SetStateAction<(typeof conditionsTypeMapping)[AttributeDataType.DateTime]>
  >;
  localData: RulesUserAttributeData | undefined;
  updateLocalData: (updates: RulesUserAttributeData) => void;
}

const RulesUserAttributeContext = createContext<RulesUserAttributeContextValue | undefined>(
  undefined,
);

function useRulesUserAttributeContext(): RulesUserAttributeContextValue {
  const context = useContext(RulesUserAttributeContext);
  if (!context) {
    throw new Error(
      'useRulesUserAttributeContext must be used within a RulesUserAttributeContext.',
    );
  }
  return context;
}

const RulesAttributeDatePicker = (props: {
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
            'w-full justify-start text-left font-normal h-9',
            !date && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'yyyy-MM-dd') : <span>Pick a date</span>}
        </Button>
      </Popover.PopoverTrigger>
      <Popover.PopoverContent
        className="w-auto p-0  z-50"
        align="start"
        style={{
          zIndex: EXTENSION_CONTENT_RULES,
        }}
      >
        <Calendar
          mode="single"
          defaultMonth={date}
          selected={date}
          onSelect={setDate}
          initialFocus
        />
      </Popover.PopoverContent>
    </Popover.Popover>
  );
};

const RulesUserAttributeName = () => {
  const [open, setOpen] = useState(false);
  const { selectedPreset, setSelectedPreset, updateLocalData } = useRulesUserAttributeContext();
  const { attributes } = useRulesContext();
  const handleOnSelected = (item: Attribute) => {
    setSelectedPreset(item);
    updateLocalData({ attrId: item.id });
    setOpen(false);
  };

  const handleFilter = useCallback(
    (value: string, search: string) => {
      if (attributes) {
        const attribute = attributes.find((attr) => attr.id === value);
        if (attribute?.displayName.includes(search)) {
          return 1;
        }
      }
      return 0;
    },
    [attributes],
  );
  const userAttributes =
    attributes?.filter((attr) => attr.bizType === AttributeBizTypes.User) || [];
  const companyAttributes =
    attributes?.filter((attr) => attr.bizType === AttributeBizTypes.Company) || [];
  const membershipAttributes =
    attributes?.filter((attr) => attr.bizType === AttributeBizTypes.Membership) || [];

  return (
    <div className="flex flex-row">
      <Popover.Popover open={open} onOpenChange={setOpen}>
        <Popover.PopoverTrigger asChild>
          <Button variant="outline" className="flex-1 justify-between ">
            {selectedPreset?.displayName}
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </Popover.PopoverTrigger>
        <Popover.PopoverContent
          className="w-[350px] p-0"
          style={{ zIndex: EXTENSION_CONTENT_RULES }}
        >
          <Command filter={handleFilter}>
            <CommandInput placeholder="Search attribute..." />
            <CommandEmpty>No items found.</CommandEmpty>
            <ScrollArea className="h-72">
              {userAttributes.length > 0 && (
                <CommandGroup heading="User attribute" style={{ zIndex: EXTENSION_CONTENT_RULES }}>
                  {userAttributes.map((item) => (
                    <CommandItem
                      key={item.id}
                      className="cursor-pointer"
                      value={item.id}
                      onSelect={() => {
                        handleOnSelected(item);
                      }}
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
              )}

              {companyAttributes.length > 0 && (
                <CommandGroup
                  heading="Company attribute"
                  style={{ zIndex: EXTENSION_CONTENT_RULES }}
                >
                  {companyAttributes.map((item) => (
                    <CommandItem
                      key={item.id}
                      className="cursor-pointer text-sm"
                      value={item.id}
                      onSelect={() => {
                        handleOnSelected(item);
                      }}
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
              )}

              {membershipAttributes.length > 0 && (
                <CommandGroup
                  heading="Membership attribute"
                  style={{ zIndex: EXTENSION_CONTENT_RULES }}
                >
                  {membershipAttributes.map((item) => (
                    <CommandItem
                      key={item.id}
                      className="cursor-pointer text-sm"
                      value={item.id}
                      onSelect={() => {
                        handleOnSelected(item);
                      }}
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
              )}
            </ScrollArea>
          </Command>
        </Popover.PopoverContent>
      </Popover.Popover>
    </div>
  );
};

const RulesUserAttributeCondition = () => {
  const { localData, updateLocalData, activeConditionMapping } = useRulesUserAttributeContext();

  const handleConditionChange = (value: string) => {
    updateLocalData({ logic: value });
  };

  return (
    <>
      <Select defaultValue={localData?.logic} onValueChange={handleConditionChange}>
        <SelectTrigger className="justify-start flex h-9">
          <div className="grow text-left">
            <SelectValue placeholder={''} />
          </div>
        </SelectTrigger>
        <SelectPortal>
          <SelectContent style={{ zIndex: EXTENSION_CONTENT_RULES }}>
            {activeConditionMapping?.map((item, index) => {
              return (
                <SelectItem key={index} value={item.value} className="cursor-pointer">
                  {item.display || item.name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </SelectPortal>
      </Select>
    </>
  );
};

const RulesUserAttributeInput = () => {
  const { localData, updateLocalData, selectedPreset } = useRulesUserAttributeContext();
  const isDateTime =
    selectedPreset?.dataType === AttributeDataType.DateTime &&
    (localData?.logic === 'on' || localData?.logic === 'after' || localData?.logic === 'before');
  const [startDate, setStartDate] = useState<Date | undefined>(
    localData?.value && isDateTime ? new Date(localData?.value) : undefined,
  );

  // Internal state for list values management
  const [listValues, setListValues] = useState<string[]>(['']);
  const [inputType, setInputType] = useState<string>('');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Handle list value changes
  const handleListValueChange = (index: number, value: string) => {
    const newValues = [...listValues];
    newValues[index] = value;

    // Always ensure there's an empty input at the end
    if (value && index === newValues.length - 1) {
      newValues.push('');
    }

    setListValues(newValues);

    // Only update localData with non-empty values
    const validValues = newValues.filter(Boolean);
    if (validValues.length > 0) {
      updateLocalData({ listValues: validValues });
    } else {
      updateLocalData({ listValues: [] });
    }
  };

  // Handle removing a list value
  const handleRemoveListValue = (index: number) => {
    if (listValues.length === 1) {
      // If it's the last input, just clear it
      setListValues(['']);
      updateLocalData({ listValues: [] });
    } else {
      const newValues = listValues.filter((_, i) => i !== index);
      // Ensure there's an empty input at the end
      if (!newValues[newValues.length - 1]) {
        newValues.push('');
      }
      setListValues(newValues);

      // Only update localData with non-empty values
      const validValues = newValues.filter(Boolean);
      if (validValues.length > 0) {
        updateLocalData({ listValues: validValues });
      } else {
        updateLocalData({ listValues: [] });
      }
    }
  };

  // Initialize list values from localData
  useEffect(() => {
    if (selectedPreset?.dataType === AttributeDataType.List) {
      if (localData?.listValues) {
        setListValues([...localData.listValues, '']);
      } else {
        setListValues(['']);
      }
    }
  }, [selectedPreset?.dataType, localData?.listValues]);

  useEffect(() => {
    if (selectedPreset?.dataType === AttributeDataType.Number) {
      setInputType('number');
    } else {
      setInputType('text');
    }
  }, [selectedPreset]);

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
  }, [startDate, isDateTime]);

  if (isDateTime) {
    return (
      <div className="flex flex-row space-x-4 items-center">
        <RulesAttributeDatePicker date={startDate} setDate={setStartDate} />
      </div>
    );
  }

  if (selectedPreset?.dataType === AttributeDataType.List) {
    if (localData?.logic === 'empty' || localData?.logic === 'any') {
      return null;
    }

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
            {/* Show remove button when input has value or it's not the last empty input */}
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
    <>
      <div className="flex flex-row space-x-4 items-center">
        {selectedPreset?.dataType !== AttributeDataType.Boolean &&
          localData?.logic !== 'empty' &&
          localData?.logic !== 'any' &&
          localData?.logic !== 'before' &&
          localData?.logic !== 'on' &&
          localData?.logic !== 'after' && (
            <Input
              type={inputType}
              value={localData?.value || ''}
              onChange={(e) => {
                updateLocalData({ value: e.target.value });
              }}
              placeholder={''}
            />
          )}
        {localData?.logic === 'between' && (
          <>
            <span>and</span>
            <Input
              type={inputType}
              value={localData?.value2 || ''}
              onChange={(e) => {
                updateLocalData({ value2: e.target.value });
              }}
              placeholder={''}
            />
          </>
        )}
      </div>
    </>
  );
};

export const RulesUserAttribute = (props: RulesUserAttributeProps) => {
  const { index, data, type } = props;
  const { attributes, isHorizontal } = useRulesContext();
  const [selectedPreset, setSelectedPreset] = useState<Attribute | null>(null);
  const { updateConditionData } = useRulesGroupContext();
  const [openError, setOpenError] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeConditionMapping, setActiveConditionMapping] = useState<
    (typeof conditionsTypeMapping)[AttributeDataType.Number]
  >(conditionsTypeMapping[AttributeDataType.Number]);
  const [localData, setLocalData] = useState<RulesUserAttributeData | undefined>(data);
  const [errorInfo, setErrorInfo] = useState('');

  const [displayCondition, setDisplayCondition] = useState<string>('');
  const [displayValue, setDisplayValue] = useState<string>('');

  const { disabled } = useRulesContext();

  useEffect(() => {
    if (attributes && data?.attrId) {
      const item = attributes.find((item: Attribute) => item.id === data?.attrId);
      if (item) {
        setSelectedPreset(item);
        updateLocalData({ attrId: item.id });
      }
    }
  }, [attributes]);

  const handleDataUpdate = useCallback(() => {
    if (localData) {
      updateConditionData(index, { ...localData });
    }
  }, [index, localData, updateConditionData]);

  const updateLocalData = useCallback(
    (updates: RulesUserAttributeData) => {
      const data = localData ? { ...localData, ...updates } : { ...updates };
      setLocalData(data);
      handleDataUpdate();
    },
    [localData],
  );

  useEffect(() => {
    if (selectedPreset?.dataType) {
      const t = selectedPreset.dataType as keyof typeof conditionsTypeMapping;
      setActiveConditionMapping(conditionsTypeMapping[t]);
    }
  }, [selectedPreset]);

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

  useEffect(() => {
    // Check if we should clear the display value
    const shouldClearDisplay =
      localData?.logic === 'empty' ||
      localData?.logic === 'any' ||
      selectedPreset?.dataType === AttributeDataType.Boolean;

    if (shouldClearDisplay) {
      setDisplayValue('');
      return;
    }

    // Handle list values
    if (localData?.listValues && selectedPreset?.dataType === AttributeDataType.List) {
      setDisplayValue(localData.listValues.join(','));
      return;
    }

    // Handle single value
    setDisplayValue(localData?.value || '');
  }, [localData, selectedPreset]);

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (open) {
      setErrorInfo('');
      setOpenError(false);
    } else {
      const { showError, errorInfo } = getUserAttrError(localData, attributes || []);
      if (showError) {
        setErrorInfo(errorInfo);
        setOpenError(true);
      } else {
        handleDataUpdate();
      }
    }
  };

  const value = {
    selectedPreset,
    setSelectedPreset,
    activeConditionMapping,
    setActiveConditionMapping,
    type,
    localData,
    updateLocalData,
  };

  return (
    <RulesUserAttributeContext.Provider value={value}>
      <RulesError open={openError}>
        <div className={cn('flex flex-row ', isHorizontal ? 'mr-1 mb-1 space-x-1 ' : 'space-x-3 ')}>
          <RulesLogic index={index} disabled={disabled} />
          <RulesErrorAnchor asChild>
            <RulesConditionRightContent disabled={disabled}>
              <RulesConditionIcon>
                <UserIcon width={16} height={16} />
              </RulesConditionIcon>
              <RulesPopover onOpenChange={handleOpenChange} open={open}>
                <RulesPopoverTrigger className={cn(isHorizontal ? 'w-auto' : '')}>
                  <span className="font-bold">{selectedPreset?.displayName} </span>
                  {displayCondition} <span className="font-bold ">{displayValue}</span>
                  {localData?.logic === 'between' && (
                    <>
                      <span className="mx-1">and</span>
                      <span className="font-bold ">{localData?.value2}</span>
                    </>
                  )}
                </RulesPopoverTrigger>
                <RulesPopoverContent>
                  <div className=" flex flex-col space-y-2">
                    <div className=" flex flex-col space-y-1">
                      <div>
                        {selectedPreset?.bizType === AttributeBizTypes.User && 'User attribute'}
                        {selectedPreset?.bizType === AttributeBizTypes.Company &&
                          'Company attribute'}
                        {selectedPreset?.bizType === AttributeBizTypes.Membership &&
                          'Membership attribute'}
                      </div>
                      <RulesUserAttributeName />
                      <RulesUserAttributeCondition />
                      <RulesUserAttributeInput />
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
    </RulesUserAttributeContext.Provider>
  );
};

RulesUserAttribute.displayName = 'RulesUserAttribute';
