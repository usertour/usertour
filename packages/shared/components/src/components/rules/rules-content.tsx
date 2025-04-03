import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import * as Popover from '@radix-ui/react-popover';
import { Label } from '@usertour-ui//label';
import { ContentIcon } from '@usertour-ui/icons';
import { RadioGroup, RadioGroupItem } from '@usertour-ui/radio-group';
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
import { useRulesGroupContext } from '../contexts/rules-group-context';

import { Button } from '@usertour-ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-ui/command';
import { ScrollArea } from '@usertour-ui/scroll-area';
import { getContentError } from '@usertour-ui/shared-utils';
import { ContentDataType } from '@usertour-ui/types';
import { useRulesContext } from './rules-context';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesLogic } from './rules-logic';
import { RulesPopover, RulesPopoverContent, RulesPopoverTrigger } from './rules-popper';
import { RulesRemove } from './rules-remove';
import { RulesConditionIcon, RulesConditionRightContent } from './rules-template';

export interface SelectItemType {
  id: string;
  name: string;
}

export interface RulesContentProps {
  data?: {
    logic: string;
    type: string;
    contentId: string;
  };
  type: string;
  index: number;
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
        <Popover.PopoverContent className="w-[350px] p-0">
          <Command filter={handleFilter}>
            <CommandInput placeholder="Search flow..." />
            <CommandEmpty>No items found.</CommandEmpty>
            <CommandGroup heading="Flow">
              <ScrollArea className="h-72">
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
              </ScrollArea>
            </CommandGroup>
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
  const { index, data } = props;
  const { updateConditionData } = useRulesGroupContext();
  const { contents, disabled } = useRulesContext();
  const item = contents.find((item) => item.id === data?.contentId);
  const [selectedPreset, setSelectedPreset] = useState<SelectItemType | null>(
    item ? { id: item.id, name: item.name || '' } : null,
  );
  const [openError, setOpenError] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  const [open, setOpen] = useState(false);
  const [conditionValue, setConditionValue] = useState(data?.logic ?? 'seen');
  const value = {
    selectedPreset,
    setSelectedPreset,
    conditionValue,
    setConditionValue,
  };

  useEffect(() => {
    if (!selectedPreset && item) {
      setSelectedPreset({ id: item?.id || '', name: item?.name || '' });
    }
  }, [item]);

  useEffect(() => {
    if (open || !selectedPreset) {
      return;
    }
    const updates = {
      contentId: selectedPreset?.id || '',
      type: 'flow',
      logic: conditionValue,
    };
    const { showError, errorInfo } = getContentError(updates);
    setOpenError(showError);
    setErrorInfo(errorInfo);
    updateConditionData(index, updates);
  }, [selectedPreset, conditionValue, open]);

  return (
    <RulesContentContext.Provider value={value}>
      <RulesError open={openError}>
        <div className="flex flex-row space-x-3">
          <RulesLogic index={index} disabled={disabled} />
          <RulesErrorAnchor asChild>
            <RulesConditionRightContent disabled={disabled}>
              <RulesConditionIcon>
                <ContentIcon width={16} height={16} />
              </RulesConditionIcon>
              <RulesPopover onOpenChange={setOpen} open={open}>
                <RulesPopoverTrigger>
                  Flow <span className="font-bold">{selectedPreset?.name} </span>
                  {conditionsMapping.find((c) => c.value === conditionValue)?.name}{' '}
                </RulesPopoverTrigger>
                <RulesPopoverContent>
                  <div className=" flex flex-col space-y-2">
                    <div>Flow</div>
                    <RulesContentName />
                    <RulesContentRadios />
                  </div>
                </RulesPopoverContent>
              </RulesPopover>
              <RulesRemove index={index} />
            </RulesConditionRightContent>
          </RulesErrorAnchor>
          <RulesErrorContent>{errorInfo}</RulesErrorContent>
        </div>
      </RulesError>
    </RulesContentContext.Provider>
  );
};

RulesContent.displayName = 'RulesContent';
