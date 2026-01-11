import { CaretSortIcon, CheckIcon, OpenInNewWindowIcon } from '@radix-ui/react-icons';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-packages/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-packages/command';
import { EDITOR_RICH_ACTION_CONTENT } from '@usertour-packages/constants';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { getContentError } from '@usertour/helpers';
import { Content, ContentDataType, Step } from '@usertour/types';
import { cn } from '@usertour-packages/tailwind';
import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useActionsGroupContext } from '../contexts/actions-group-context';
import { useContentActionsContext } from '../contexts/content-actions-context';
import {
  ContentActionsError,
  ContentActionsErrorAnchor,
  ContentActionsErrorContent,
} from './actions-error';
import {
  ContentActionsPopover,
  ContentActionsPopoverContent,
  ContentActionsPopoverTrigger,
} from './actions-popper';
import { ContentActionsRemove } from './actions-remove';
import { ActionsConditionRightContent, ContentActionsConditionIcon } from './actions-template';
import { EyeNoneIcon, ModelIcon, TooltipIcon } from '@usertour-packages/icons';
import { useAutoOpenPopover } from './use-auto-open-popover';

export interface SelectItemType {
  id: string;
  name: string;
}

export interface ContentActionsContentsProps {
  data?: {
    logic: string;
    type: string;
    contentId: string;
    stepCvid?: string;
  };
  type: string;
  index: number;
  conditionId?: string;
}

interface ContentActionsContentsContextValue {
  selectedPreset: SelectItemType | null;
  setSelectedPreset: Dispatch<SetStateAction<SelectItemType | null>>;
  stepCvid: string | undefined;
  setStepCvid: Dispatch<SetStateAction<string | undefined>>;
}

const ContentActionsContentsContext = createContext<ContentActionsContentsContextValue | undefined>(
  undefined,
);

function useContentActionsContentsContext(): ContentActionsContentsContextValue {
  const context = useContext(ContentActionsContentsContext);
  if (!context) {
    throw new Error(
      'useContentActionsContentsContext must be used within a ContentActionsContentsContext.',
    );
  }
  return context;
}

// Get display text for selected step
const getDisplayText = (steps: Step[], stepCvid: string | undefined) => {
  const selectedStep = steps?.find((step) => step.cvid === stepCvid);
  if (selectedStep) {
    const stepIndex = steps?.findIndex((step) => step.cvid === stepCvid) ?? 0;
    return `${stepIndex + 1}. ${selectedStep.name}`;
  }
  return '';
};

// Get step type icon
const getStepTypeIcon = (type: string) => {
  switch (type) {
    case 'hidden':
      return <EyeNoneIcon className="w-4 h-4 mr-1" />;
    case 'tooltip':
      return <TooltipIcon className="w-4 h-4 mt-1 mr-1" />;
    case 'modal':
      return <ModelIcon className="w-4 h-4 mt-0.5 mr-1" />;
    default:
      return null;
  }
};

// Reusable command item component
const CommandItemWithCheck = ({
  value,
  onSelect,
  children,
  isSelected,
}: {
  value: string;
  onSelect: () => void;
  children: React.ReactNode;
  isSelected: boolean;
}) => (
  <CommandItem value={value} className="cursor-pointer" onSelect={onSelect}>
    {children}
    <CheckIcon className={cn('ml-auto h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
  </CommandItem>
);

// Reusable popover wrapper
const PopoverWrapper = ({
  open,
  onOpenChange,
  trigger,
  children,
  zIndex,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  zIndex: number;
}) => (
  <Popover.Popover open={open} onOpenChange={onOpenChange}>
    <Popover.PopoverTrigger asChild>{trigger}</Popover.PopoverTrigger>
    <Popover.PopoverContent
      className="w-[350px] p-0"
      style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT + 1 }}
    >
      {children}
    </Popover.PopoverContent>
  </Popover.Popover>
);

const ContentActionsContentsName = () => {
  const [open, setOpen] = useState(false);
  const { selectedPreset, setSelectedPreset } = useContentActionsContentsContext();
  const { contents, zIndex } = useContentActionsContext();

  const handleOnSelected = useCallback(
    (item: SelectItemType) => {
      setSelectedPreset(item);
      setOpen(false);
    },
    [setSelectedPreset],
  );

  const handleFilter = useCallback(
    (value: string, search: string) => {
      if (contents && contents.length > 0) {
        const flow = contents.find((flow) => flow.id === value);
        if (flow?.name?.includes(search)) {
          return 1;
        }
      }
      return 0;
    },
    [contents],
  );

  // Memoize filtered contents
  const { flows, checklists } = useMemo(() => {
    if (!contents || contents.length === 0) {
      return { flows: [], checklists: [] };
    }

    return {
      flows: contents.filter((c) => c.type === ContentDataType.FLOW),
      checklists: contents.filter((c) => c.type === ContentDataType.CHECKLIST),
    };
  }, [contents]);

  const trigger = (
    <Button variant="outline" className="flex-1 justify-between min-w-0 overflow-hidden">
      <span className="truncate min-w-0" title={selectedPreset?.name}>
        {selectedPreset?.name || 'Select content...'}
      </span>
      <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  return (
    <div className="flex flex-row w-full">
      <PopoverWrapper open={open} onOpenChange={setOpen} trigger={trigger} zIndex={zIndex}>
        <Command filter={handleFilter}>
          <CommandInput placeholder="Search flow/checklist..." />
          <CommandEmpty>No items found.</CommandEmpty>
          <ScrollArea className="h-72">
            {flows.length > 0 && (
              <CommandGroup heading="Flow">
                {flows.map((item) => (
                  <CommandItemWithCheck
                    key={item.id}
                    value={item.id}
                    onSelect={() =>
                      handleOnSelected({
                        id: item.id,
                        name: item.name || '',
                      })
                    }
                    isSelected={selectedPreset?.id === item.id}
                  >
                    <span className="truncate" title={item.name}>
                      {item.name}
                    </span>
                  </CommandItemWithCheck>
                ))}
              </CommandGroup>
            )}
            {checklists.length > 0 && (
              <CommandGroup heading="Checklist">
                {checklists.map((item) => (
                  <CommandItemWithCheck
                    key={item.id}
                    value={item.id}
                    onSelect={() =>
                      handleOnSelected({
                        id: item.id,
                        name: item.name || '',
                      })
                    }
                    isSelected={selectedPreset?.id === item.id}
                  >
                    <span className="truncate" title={item.name}>
                      {item.name}
                    </span>
                  </CommandItemWithCheck>
                ))}
              </CommandGroup>
            )}
          </ScrollArea>
        </Command>
      </PopoverWrapper>
    </div>
  );
};

const ContentActionsStep = ({ content }: { content: Content }) => {
  const { zIndex } = useContentActionsContext();
  const { stepCvid, setStepCvid } = useContentActionsContentsContext();
  const steps = content.steps || [];
  const [open, setOpen] = useState(false);

  const handleSelectStep = useCallback(
    (cvid: string) => {
      setStepCvid(cvid);
      setOpen(false);
    },
    [setStepCvid],
  );

  const handleFilter = useCallback(
    (value: string, search: string) => {
      if (steps && steps.length > 0) {
        const step = steps?.find((step) => step.cvid === value);
        if (step?.name?.includes(search)) {
          return 1;
        }
      }
      return 0;
    },
    [steps],
  );

  const displayText = useMemo(() => getDisplayText(steps, stepCvid), [steps, stepCvid]);

  const trigger = (
    <Button variant="outline" className="flex-1 justify-between min-w-0 overflow-hidden">
      <span className="truncate min-w-0" title={displayText}>
        {displayText || 'Select step...'}
      </span>
      <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  return (
    <div className="flex flex-row">
      <PopoverWrapper open={open} onOpenChange={setOpen} trigger={trigger} zIndex={zIndex}>
        <Command filter={handleFilter}>
          <CommandInput placeholder="Search steps..." />
          <CommandEmpty>No items found.</CommandEmpty>
          <ScrollArea className="h-72">
            <CommandGroup heading="Steps">
              {steps?.map((item, index) => (
                <CommandItemWithCheck
                  key={item.cvid}
                  value={item.cvid as string}
                  onSelect={() => handleSelectStep(item.cvid as string)}
                  isSelected={stepCvid === item.cvid}
                >
                  <div className="flex items-center w-full min-w-0">
                    {getStepTypeIcon(item.type)}
                    <span className="flex-shrink-0 mr-1">{index + 1}.</span>
                    <span className="truncate min-w-0">{item.name}</span>
                  </div>
                </CommandItemWithCheck>
              ))}
            </CommandGroup>
          </ScrollArea>
        </Command>
      </PopoverWrapper>
    </div>
  );
};

// Custom hook for error handling
const useErrorHandling = (
  selectedPreset: SelectItemType | null,
  stepCvid: string | undefined,
  open: boolean,
) => {
  const [openError, setOpenError] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');

  useEffect(() => {
    const updates = {
      contentId: selectedPreset?.id || '',
      stepCvid: stepCvid || '',
      type: 'flow',
      logic: 'and',
    };
    const { showError, errorInfo } = getContentError(updates);
    if (showError && !open) {
      setErrorInfo(errorInfo);
      setOpenError(true);
    }
  }, [selectedPreset, open, stepCvid]);

  return { openError, setOpenError, errorInfo, setErrorInfo };
};

export const ContentActionsContents = (props: ContentActionsContentsProps) => {
  const { index, data, conditionId } = props;
  const { updateConditionData } = useActionsGroupContext();
  const { contents, zIndex } = useContentActionsContext();

  // Memoize initial item
  const initialItem = useMemo(
    () =>
      contents && contents.length > 0
        ? contents?.find((item) => item.id === data?.contentId)
        : undefined,
    [contents, data?.contentId],
  );

  const [selectedPreset, setSelectedPreset] = useState<SelectItemType | null>(
    initialItem ? { id: initialItem?.id, name: initialItem?.name || '' } : null,
  );
  const [stepCvid, setStepCvid] = useState<string | undefined>(data?.stepCvid);
  const [open, setOpen] = useAutoOpenPopover(conditionId);

  // Memoize context value
  const contextValue = useMemo(
    () => ({
      selectedPreset,
      setSelectedPreset,
      stepCvid,
      setStepCvid,
    }),
    [selectedPreset, stepCvid],
  );

  // Memoize selected content and step index
  const selectedContent = useMemo(
    () => contents?.find((c) => c.id === selectedPreset?.id),
    [contents, selectedPreset?.id],
  );

  const stepIndex = useMemo(
    () => selectedContent?.steps?.findIndex((step) => step.cvid === stepCvid) ?? -1,
    [selectedContent?.steps, stepCvid],
  );

  const { openError, setOpenError, errorInfo, setErrorInfo } = useErrorHandling(
    selectedPreset,
    stepCvid,
    open,
  );

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
        stepCvid: stepIndex !== -1 ? stepCvid : undefined,
        type: 'flow',
        logic: 'and',
      };
      const { showError, errorInfo } = getContentError(updates);

      if (showError) {
        setErrorInfo(errorInfo);
        setOpenError(true);
        return;
      }

      updateConditionData(index, updates);
    },
    [selectedPreset, stepCvid, updateConditionData, index, stepIndex, setErrorInfo, setOpenError],
  );

  // Memoize display text
  const displayText = useMemo(() => {
    const contentType = selectedContent?.type === ContentDataType.FLOW ? 'flow' : 'checklist';
    const stepText =
      selectedContent?.type === ContentDataType.FLOW && stepCvid && stepIndex !== -1
        ? `, at step: ${stepIndex + 1}`
        : '';

    return `Start ${contentType}: ${selectedPreset?.name || ''}${stepText}`;
  }, [selectedContent?.type, selectedPreset?.name, stepCvid, stepIndex]);

  return (
    <ContentActionsContentsContext.Provider value={contextValue}>
      <ContentActionsError open={openError}>
        <div className="flex flex-row space-x-3">
          <ContentActionsErrorAnchor>
            <ActionsConditionRightContent>
              <ContentActionsPopover onOpenChange={handleOnOpenChange} open={open}>
                <ContentActionsPopoverTrigger className="flex flex-row items-center min-w-0 overflow-hidden">
                  <ContentActionsConditionIcon>
                    <OpenInNewWindowIcon width={16} height={16} />
                  </ContentActionsConditionIcon>
                  <span className="truncate" title={displayText}>
                    {displayText}
                  </span>
                </ContentActionsPopoverTrigger>
                <ContentActionsPopoverContent
                  style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT }}
                >
                  <div className="flex flex-col space-y-2">
                    <div>
                      {selectedContent?.type === ContentDataType.FLOW ? 'Flow' : 'Checklist'}
                    </div>
                    <ContentActionsContentsName />
                    {selectedContent?.type === ContentDataType.FLOW && (
                      <>
                        <span>Step to start at</span>
                        <ContentActionsStep content={selectedContent} />
                      </>
                    )}
                  </div>
                </ContentActionsPopoverContent>
              </ContentActionsPopover>
              <ContentActionsRemove index={index} />
            </ActionsConditionRightContent>
          </ContentActionsErrorAnchor>
          <ContentActionsErrorContent style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT + 3 }}>
            {errorInfo}
          </ContentActionsErrorContent>
        </div>
      </ContentActionsError>
    </ContentActionsContentsContext.Provider>
  );
};

ContentActionsContents.displayName = 'ContentActionsContents';
