import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import * as Popover from '@radix-ui/react-popover';
import { Label } from '@usertour-packages//label';
import { ContentIcon } from '@usertour-packages/icons';
import { RadioGroup, RadioGroupItem } from '@usertour-packages/radio-group';
import { cn } from '@usertour/helpers';
import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRulesGroupContext } from '../contexts/rules-group-context';

import { Button } from '@usertour-packages/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-packages/command';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { getContentError } from '@usertour/helpers';
import { ContentDataType } from '@usertour/types';
import { useRulesContext, useRulesZIndex } from './rules-context';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesLogic } from './rules-logic';
import { RulesPopover, RulesPopoverContent, RulesPopoverTrigger } from './rules-popper';
import { RulesRemove } from './rules-remove';
import { RulesConditionRightContent } from './rules-template';
import { useAutoOpenPopover } from './use-auto-open-popover';

export interface SelectItemType {
  id: string;
  name: string;
  type: string;
}

export interface RulesContentProps {
  data?: {
    logic: string;
    type: string;
    contentId: string;
  };
  type: string;
  index: number;
  conditionId?: string;
}

const conditionsMapping = [
  { value: 'seen', name: 'seen' },
  { value: 'unseen', name: 'not seen' },
  { value: 'completed', name: 'completed' },
  { value: 'uncompleted', name: 'not completed' },
  { value: 'actived', name: 'is currently actived' },
  { value: 'unactived', name: 'is not currently actived' },
];

interface RulesContentContextValue {
  selectedPreset: SelectItemType | null;
  setSelectedPreset: Dispatch<SetStateAction<SelectItemType | null>>;
  conditionValue: string;
  setConditionValue: Dispatch<SetStateAction<string>>;
}

const RulesContentContext = createContext<RulesContentContextValue | undefined>(undefined);

function useRulesContentContext(): RulesContentContextValue {
  const context = useContext(RulesContentContext);
  if (!context) {
    throw new Error('useRulesContentContext must be used within a RulesContentContext.');
  }
  return context;
}

const RulesContentName = () => {
  const [open, setOpen] = useState(false);
  const { selectedPreset, setSelectedPreset } = useRulesContentContext();
  const { contents } = useRulesContext();
  const { popover: zIndex } = useRulesZIndex();
  const handleOnSelected = (item: SelectItemType) => {
    setSelectedPreset(item);
    setOpen(false);
  };

  const handleFilter = useCallback(
    (value: string, search: string) => {
      if (contents) {
        const content = contents.find((content) => content.id === value);
        if (content?.name?.includes(search)) {
          return 1;
        }
      }
      return 0;
    },
    [contents],
  );
  return (
    <div className="flex flex-row">
      <Popover.Popover open={open} onOpenChange={setOpen}>
        <Popover.PopoverTrigger asChild>
          <Button variant="outline" className="flex-1 justify-between ">
            {selectedPreset?.name}
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </Popover.PopoverTrigger>
        <Popover.PopoverContent className="w-[350px] p-0" style={{ zIndex }}>
          <Command filter={handleFilter}>
            <CommandInput placeholder="Search content..." />
            <CommandEmpty>No items found.</CommandEmpty>
            <ScrollArea className="h-72">
              <CommandGroup heading="Flow">
                {contents
                  ?.filter((c) => c.type === ContentDataType.FLOW)
                  .map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      className="cursor-pointer"
                      onSelect={() => {
                        handleOnSelected({
                          id: item.id,
                          name: item.name || '',
                          type: item.type,
                        });
                      }}
                    >
                      {item.name}
                      <CheckIcon
                        className={cn(
                          'ml-auto h-4 w-4',
                          selectedPreset?.id === item.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </CommandItem>
                  ))}
              </CommandGroup>
              <CommandGroup heading="Checklist">
                {contents
                  ?.filter((c) => c.type === ContentDataType.CHECKLIST)
                  .map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      className="cursor-pointer"
                      onSelect={() => {
                        handleOnSelected({
                          id: item.id,
                          name: item.name || '',
                          type: item.type,
                        });
                      }}
                    >
                      {item.name}
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
        </Popover.PopoverContent>
      </Popover.Popover>
    </div>
  );
};

const RulesContentRadios = () => {
  const { conditionValue = 'seen', setConditionValue } = useRulesContentContext();
  return (
    <RadioGroup defaultValue={conditionValue} onValueChange={setConditionValue}>
      {conditionsMapping.map((condition, index) => (
        <div className="flex items-center space-x-2" key={index}>
          <RadioGroupItem value={condition.value} id={`r1${index}`} />
          <Label htmlFor={`r1${index}`} className="cursor-pointer">
            {condition.name}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
};

export const RulesContent = (props: RulesContentProps) => {
  const { index, data, conditionId } = props;
  const { updateConditionData } = useRulesGroupContext();
  const { contents, disabled } = useRulesContext();
  const { error: errorZIndex } = useRulesZIndex();

  const [selectedPreset, setSelectedPreset] = useState<SelectItemType | null>(null);
  const [openError, setOpenError] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  const [open, setOpen] = useAutoOpenPopover(conditionId);
  const [conditionValue, setConditionValue] = useState(data?.logic ?? 'seen');

  const value = {
    selectedPreset,
    setSelectedPreset,
    conditionValue,
    setConditionValue,
  };

  // Initialize or sync selectedPreset from data.contentId when component mounts or data changes
  // This only runs when data.contentId or contents change, not when user selects
  useEffect(() => {
    if (data?.contentId && contents && contents.length > 0) {
      const newItem = contents.find((item) => item.id === data.contentId);
      // Only sync if selectedPreset doesn't match data.contentId (initialization or external update)
      if (newItem && selectedPreset?.id !== data.contentId) {
        setSelectedPreset({
          id: newItem.id,
          name: newItem.name || '',
          type: newItem.type || data?.type || 'flow',
        });
      }
    }
  }, [data?.contentId, data?.type, contents]);

  // Error checking when popover closes or condition changes
  useEffect(() => {
    if (open) {
      setOpenError(false);
      setErrorInfo('');
      return;
    }

    // Use selectedPreset?.id instead of data?.contentId to check user's current selection
    const { showError, errorInfo } = getContentError({
      contentId: selectedPreset?.id || data?.contentId || '',
      type: selectedPreset?.type || data?.type || 'flow',
      logic: conditionValue,
    });

    if (showError) {
      setErrorInfo(errorInfo);
      setOpenError(true);
    }
  }, [data?.contentId, data?.type, conditionValue, open, selectedPreset?.id, selectedPreset?.type]);

  const handleOnOpenChange = useCallback(
    (open: boolean) => {
      setOpen(open);
      if (open) {
        setErrorInfo('');
        setOpenError(false);
        return;
      }

      const updates = {
        contentId: selectedPreset?.id || '',
        type: selectedPreset?.type || 'flow',
        logic: conditionValue,
      };

      const { showError, errorInfo } = getContentError(updates);
      if (showError) {
        setErrorInfo(errorInfo);
        setOpenError(true);
        return;
      }

      updateConditionData(index, updates);
    },
    [selectedPreset, conditionValue, index, updateConditionData, setOpen],
  );

  return (
    <RulesContentContext.Provider value={value}>
      <RulesError open={openError}>
        <div className="flex flex-row space-x-3">
          <RulesLogic index={index} disabled={disabled} />
          <RulesErrorAnchor asChild>
            <RulesConditionRightContent disabled={disabled}>
              <RulesPopover onOpenChange={handleOnOpenChange} open={open}>
                <RulesPopoverTrigger icon={<ContentIcon width={16} height={16} />}>
                  {selectedPreset?.type === ContentDataType.CHECKLIST ? 'Checklist' : 'Flow'}{' '}
                  <span className="font-bold">{selectedPreset?.name} </span>
                  {conditionsMapping.find((c) => c.value === conditionValue)?.name}{' '}
                </RulesPopoverTrigger>
                <RulesPopoverContent>
                  <div className="flex flex-col space-y-2">
                    <div>
                      {selectedPreset?.type === ContentDataType.CHECKLIST ? 'Checklist' : 'Flow'}
                    </div>
                    <RulesContentName />
                    <RulesContentRadios />
                  </div>
                </RulesPopoverContent>
              </RulesPopover>
              <RulesRemove index={index} />
            </RulesConditionRightContent>
          </RulesErrorAnchor>
          <RulesErrorContent zIndex={errorZIndex}>{errorInfo}</RulesErrorContent>
        </div>
      </RulesError>
    </RulesContentContext.Provider>
  );
};

RulesContent.displayName = 'RulesContent';
