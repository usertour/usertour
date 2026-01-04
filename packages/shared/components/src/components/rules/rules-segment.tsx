import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-packages/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-packages/command';
import { SegmentIcon } from '@usertour-packages/icons';
import { cn } from '@usertour/helpers';
import { ComboBox } from '@usertour-packages/combo-box';
import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { getSegmentError } from '@usertour/helpers';
import { Segment } from '@usertour/types';
import { useRulesContext, useRulesZIndex } from './rules-context';
import { useRulesGroupContext } from '../contexts/rules-group-context';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesPopover, RulesPopoverContent } from './rules-popper';
import { RulesPopoverTriggerWrapper } from './rules-wrapper';
import { RulesRemove } from './rules-remove';
import { RulesConditionRightContent } from './rules-template';
import { useAutoOpenPopover } from './use-auto-open-popover';

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
  conditionId?: string;
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
  const { popover: zIndex } = useRulesZIndex();
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
        <Popover.PopoverContent className="w-[350px] p-0" style={{ zIndex }}>
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
  const { combobox: zIndex } = useRulesZIndex();

  return (
    <ComboBox
      options={conditions}
      value={conditionValue}
      onValueChange={setConditionValue}
      placeholder="Select condition"
      contentStyle={{ zIndex }}
    />
  );
};

export const RulesSegment = (props: RulesSegmentProps) => {
  const { index, data, conditionId } = props;
  const { segments, disabled } = useRulesContext();
  const { error: errorZIndex } = useRulesZIndex();
  const [segmentId, setSegmentId] = useState<string>(data?.segmentId ?? '');
  const [conditionValue, setConditionValue] = useState(data?.logic ?? 'is');
  const [openError, setOpenError] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  const [open, setOpen] = useAutoOpenPopover(conditionId);
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
    if (open) {
      setOpenError(false);
      setErrorInfo('');
      return;
    }
    const updates = {
      segmentId: segmentId,
      logic: conditionValue,
    };
    const { showError, errorInfo } = getSegmentError(updates);
    if (showError) {
      setErrorInfo(errorInfo);
      setOpenError(true);
    }
  }, [conditionValue, open, segmentId, setErrorInfo, setOpenError]);

  const handleOnOpenChange = useCallback(
    (open: boolean) => {
      setOpen(open);
      if (open) {
        setErrorInfo('');
        setOpenError(false);
        return;
      }
      const updates = {
        segmentId: segmentId,
        logic: conditionValue,
      };
      const { showError, errorInfo } = getSegmentError(updates);
      if (showError) {
        setErrorInfo(errorInfo);
        setOpenError(true);
        return;
      }
      updateConditionData(index, updates);
    },
    [conditionValue, segmentId, index, updateConditionData],
  );

  return (
    <RulesSegmentContext.Provider value={value}>
      <RulesError open={openError}>
        <RulesErrorAnchor asChild>
          <RulesConditionRightContent disabled={disabled}>
            <RulesPopover onOpenChange={handleOnOpenChange} open={open} defaultOpen={false}>
              <RulesPopoverTriggerWrapper icon={<SegmentIcon width={16} height={16} />}>
                {selectedPreset === undefined && 'User'}
                {selectedPreset?.bizType === 'USER' && 'User'}
                {selectedPreset?.bizType === 'COMPANY' && 'Company'}{' '}
                {conditions.find((c) => c.value === conditionValue)?.name}{' '}
                <span className="font-bold">{selectedPreset?.name} </span>
              </RulesPopoverTriggerWrapper>
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
        <RulesErrorContent zIndex={errorZIndex}>{errorInfo}</RulesErrorContent>
      </RulesError>
    </RulesSegmentContext.Provider>
  );
};

RulesSegment.displayName = 'RulesSegment';
