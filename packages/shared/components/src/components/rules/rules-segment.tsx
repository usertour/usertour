import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import * as Popover from '@radix-ui/react-popover';
import { SegmentIcon } from '@usertour-ui/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-ui/select';
import { cn } from '@usertour-ui/ui-utils';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-ui/command';
import { EXTENSION_CONTENT_RULES } from '@usertour-ui/constants';
import { ScrollArea } from '@usertour-ui/scroll-area';
import { getSegmentError } from '@usertour-ui/shared-utils';
import { Segment } from '@usertour-ui/types';
import { useRulesContext } from './rules-context';
import { useRulesGroupContext } from '../contexts/rules-group-context';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesLogic } from './rules-logic';
import { RulesPopover, RulesPopoverContent, RulesPopoverTrigger } from './rules-popper';
import { RulesRemove } from './rules-remove';
import { RulesConditionIcon, RulesConditionRightContent } from './rules-template';

export interface SelectItemType {
  id: string;
  name: string;
}
export interface RulesSegmentProps {
  index: number;
  type: string;
  data?: {
    logic: string;
    segmentId: string;
  };
}

const conditions = [
  { value: 'is', name: 'is in' },
  { value: 'not', name: 'is not in' },
];

interface RulesSegmentContextValue {
  segmentId: string;
  setSegmentId: Dispatch<SetStateAction<string>>;
  conditionValue: string;
  setConditionValue: Dispatch<SetStateAction<string>>;
  segments: Segment[] | undefined;
}

const RulesSegmentContext = createContext<RulesSegmentContextValue | undefined>(undefined);

function useRulesSegmentContext(): RulesSegmentContextValue {
  const context = useContext(RulesSegmentContext);
  if (!context) {
    throw new Error('useRulesSegmentContext must be used within a RulesSegmentContext.');
  }
  return context;
}

const RulesSegmentName = () => {
  const [open, setOpen] = useState(false);
  const { segmentId, setSegmentId, segments } = useRulesSegmentContext();
  const selectedSegment = segments?.find((segment) => segment.id === segmentId);
  const handleOnSelected = (item: Segment) => {
    setSegmentId(item.id);
    setOpen(false);
  };

  const handleFilter = useCallback(
    (value: string, search: string) => {
      if (segments) {
        const segment = segments.find((item) => item.id === value);
        if (segment?.name.includes(search)) {
          return 1;
        }
      }
      return 0;
    },
    [segments],
  );

  return (
    <div className="flex flex-row">
      <Popover.Popover open={open} onOpenChange={setOpen}>
        <Popover.PopoverTrigger asChild>
          <Button variant="outline" className="flex-1 justify-between ">
            {selectedSegment?.name}
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </Popover.PopoverTrigger>
        <Popover.PopoverContent className="w-[350px] p-0">
          <Command filter={handleFilter}>
            <CommandInput placeholder="" />
            <CommandEmpty>No items found.</CommandEmpty>
            <ScrollArea className="h-72">
              <CommandGroup heading="User segment">
                {segments
                  ?.filter((item) => item.bizType === 'USER')
                  .map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      className="cursor-pointer"
                      onSelect={() => {
                        handleOnSelected(item);
                      }}
                    >
                      {item.name}
                      <CheckIcon
                        className={cn(
                          'ml-auto h-4 w-4',
                          segmentId === item.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </CommandItem>
                  ))}
              </CommandGroup>
              <CommandGroup heading="Company segment">
                {segments
                  ?.filter((item) => item.bizType === 'COMPANY')
                  .map((item) => (
                    <CommandItem
                      key={item.id}
                      className="cursor-pointer"
                      value={item.id}
                      onSelect={() => {
                        handleOnSelected(item);
                      }}
                    >
                      {item.name}
                      <CheckIcon
                        className={cn(
                          'ml-auto h-4 w-4',
                          segmentId === item.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </CommandItem>
                  ))}
              </CommandGroup>
            </ScrollArea>
          </Command>
        </Popover.PopoverContent>
      </Popover.Popover>
    </div>
  );
};

const RulesSegmentCondition = () => {
  const { conditionValue, setConditionValue } = useRulesSegmentContext();
  return (
    <>
      <Select defaultValue={conditionValue} onValueChange={setConditionValue}>
        <SelectTrigger className="justify-start flex h-9">
          <div className="grow text-left">
            <SelectValue placeholder={''} />
          </div>
        </SelectTrigger>
        <SelectPortal>
          <SelectContent
            style={{
              zIndex: EXTENSION_CONTENT_RULES,
            }}
          >
            {conditions.map((item, index) => {
              return (
                <SelectItem key={index} value={item.value} className="cursor-pointer">
                  {item.name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </SelectPortal>
      </Select>
    </>
  );
};

export const RulesSegment = (props: RulesSegmentProps) => {
  const { index, data } = props;
  const { segments, disabled } = useRulesContext();
  const [segmentId, setSegmentId] = useState<string>(data?.segmentId ?? '');
  const [conditionValue, setConditionValue] = useState(data?.logic ?? 'is');
  const [openError, setOpenError] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  const [open, setOpen] = useState(false);
  const { updateConditionData } = useRulesGroupContext();

  const selectedPreset =
    segments && data?.segmentId
      ? segments.find((item: Segment) => item.id === data.segmentId)
      : undefined;

  const value = {
    segmentId,
    setSegmentId,
    conditionValue,
    setConditionValue,
    segments,
  };

  useEffect(() => {
    if (!conditionValue || open) {
      return;
    }
    const updates = {
      segmentId: segmentId,
      logic: conditionValue,
    };
    const { showError, errorInfo } = getSegmentError(updates);
    setOpenError(showError);
    setErrorInfo(errorInfo);
    updateConditionData(index, updates);
  }, [conditionValue, open, segmentId]);

  return (
    <RulesSegmentContext.Provider value={value}>
      <RulesError open={openError}>
        <div className="flex flex-row space-x-3">
          <RulesLogic index={index} disabled={disabled} />
          <RulesErrorAnchor asChild>
            <RulesConditionRightContent disabled={disabled}>
              <RulesConditionIcon>
                <SegmentIcon width={16} height={16} />
              </RulesConditionIcon>
              <RulesPopover onOpenChange={setOpen} open={open} defaultOpen={false}>
                <RulesPopoverTrigger>
                  {selectedPreset === undefined && 'User'}
                  {selectedPreset?.bizType === 'USER' && 'User'}
                  {selectedPreset?.bizType === 'COMPANY' && 'Company'}{' '}
                  {conditions.find((c) => c.value === conditionValue)?.name}{' '}
                  <span className="font-bold">{selectedPreset?.name} </span>
                </RulesPopoverTrigger>
                <RulesPopoverContent>
                  <div className=" flex flex-col space-y-2">
                    <div className=" flex flex-col space-y-1">
                      <div>
                        {selectedPreset === undefined && 'User'}
                        {selectedPreset?.bizType === 'USER' && 'User'}
                        {selectedPreset?.bizType === 'COMPANY' && 'Company'}
                      </div>
                      <RulesSegmentCondition />
                      <RulesSegmentName />
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
    </RulesSegmentContext.Provider>
  );
};

RulesSegment.displayName = 'RulesSegment';
