import { CaretSortIcon, CheckIcon, OpenInNewWindowIcon } from '@radix-ui/react-icons';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-ui/command';
import { EDITOR_RICH_ACTION_CONTENT } from '@usertour-ui/constants';
import { ScrollArea } from '@usertour-ui/scroll-area';
import { getContentError } from '@usertour-ui/shared-utils';
import { Content, ContentDataType, Step } from '@usertour-ui/types';
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
import { EyeNoneIcon, ModelIcon, TooltipIcon } from '@usertour-ui/icons';

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

const ContentActionsContentsName = () => {
  const [open, setOpen] = useState(false);
  const { selectedPreset, setSelectedPreset } = useContentActionsContentsContext();
  const { contents, zIndex } = useContentActionsContext();
  const handleOnSelected = (item: SelectItemType) => {
    setSelectedPreset(item);
    setOpen(false);
  };

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
  return (
    <div className="flex flex-row">
      <Popover.Popover open={open} onOpenChange={setOpen}>
        <Popover.PopoverTrigger asChild>
          <Button variant="outline" className="flex-1 justify-between ">
            {selectedPreset?.name}
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </Popover.PopoverTrigger>
        <Popover.PopoverContent
          className="w-[350px] p-0"
          style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT + 1 }}
        >
          <Command filter={handleFilter}>
            <CommandInput placeholder="Search flow/checklist..." />
            <CommandEmpty>No items found.</CommandEmpty>
            <ScrollArea className="h-72">
              <CommandGroup heading="Flow">
                {contents &&
                  contents.length > 0 &&
                  contents
                    .filter((c) => c.type === ContentDataType.FLOW)
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
              </CommandGroup>
              <CommandGroup heading="Checklist">
                {contents &&
                  contents.length > 0 &&
                  contents
                    .filter((c) => c.type === ContentDataType.CHECKLIST)
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
              </CommandGroup>
            </ScrollArea>
          </Command>
        </Popover.PopoverContent>
      </Popover.Popover>
    </div>
  );
};

const ContentActionsStep = (props: { content: Content }) => {
  const { content } = props;
  const { zIndex } = useContentActionsContext();
  const { stepCvid, setStepCvid } = useContentActionsContentsContext();
  const steps = content.steps || [];
  const [open, setOpen] = useState(false);

  const handleSelectStep = (cvid: string) => {
    setStepCvid(cvid);
    setOpen(false);
  };

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

  return (
    <div className="flex flex-row">
      <Popover.Popover open={open} onOpenChange={setOpen}>
        <Popover.PopoverTrigger asChild>
          <Button variant="outline" className="flex-1 justify-between ">
            <div className="max-w-[240px] truncate flex items-center ">
              <span className="truncate">{getDisplayText(steps, stepCvid)}</span>
            </div>
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </Popover.PopoverTrigger>
        <Popover.PopoverContent
          className="w-[350px] p-0"
          style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT + 1 }}
        >
          <Command filter={handleFilter}>
            <CommandInput placeholder="Search steps..." />
            <CommandEmpty>No items found.</CommandEmpty>
            <ScrollArea className="h-72">
              <CommandGroup heading="Steps">
                {steps?.map((item, index) => {
                  return (
                    <CommandItem
                      key={item.cvid}
                      value={item.cvid as string}
                      onSelect={() => handleSelectStep(item.cvid as string)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center w-full min-w-0">
                        {item.type === 'hidden' && <EyeNoneIcon className="w-4 h-4 mr-1" />}
                        {item.type === 'tooltip' && <TooltipIcon className="w-4 h-4 mt-1 mr-1" />}
                        {item.type === 'modal' && <ModelIcon className="w-4 h-4 mt-0.5 mr-1" />}
                        <span className="flex-shrink-0 mr-1">{index + 1}.</span>
                        <span className="truncate min-w-0">{item.name}</span>
                      </div>
                      <CheckIcon
                        className={cn(
                          'ml-auto h-4 w-4',
                          stepCvid === item.cvid ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </ScrollArea>
          </Command>
        </Popover.PopoverContent>
      </Popover.Popover>
    </div>
  );
};

export const ContentActionsContents = (props: ContentActionsContentsProps) => {
  const { index, data } = props;
  const { updateConditionData } = useActionsGroupContext();
  const { contents, zIndex } = useContentActionsContext();
  const item =
    contents && contents.length > 0
      ? contents?.find((item) => item.id === data?.contentId)
      : undefined;
  const [selectedPreset, setSelectedPreset] = useState<SelectItemType | null>(
    item ? { id: item?.id, name: item?.name || '' } : null,
  );
  const [stepCvid, setStepCvid] = useState<string | undefined>(data?.stepCvid);
  const [openError, setOpenError] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  const [open, setOpen] = useState(false);
  const value = {
    selectedPreset,
    setSelectedPreset,
    stepCvid,
    setStepCvid,
  };

  const selectedContent = contents?.find((c) => c.id === selectedPreset?.id);

  const stepIndex = selectedContent?.steps?.findIndex((step) => step.cvid === stepCvid) ?? -1;

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
  }, [selectedPreset, open, stepCvid, setErrorInfo, setOpenError]);

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
    [selectedPreset, open, stepCvid, updateConditionData, index, stepIndex],
  );

  return (
    <ContentActionsContentsContext.Provider value={value}>
      <ContentActionsError open={openError}>
        <div className="flex flex-row space-x-3">
          <ContentActionsErrorAnchor>
            <ActionsConditionRightContent>
              <ContentActionsPopover onOpenChange={handleOnOpenChange} open={open}>
                <ContentActionsPopoverTrigger className="flex flex-row w-fit">
                  <ContentActionsConditionIcon>
                    <OpenInNewWindowIcon width={16} height={16} />
                  </ContentActionsConditionIcon>
                  Start {selectedContent?.type === ContentDataType.FLOW ? 'flow' : 'checklist'}:{' '}
                  <span className="font-bold">{selectedPreset?.name} </span>
                  {selectedContent?.type === ContentDataType.FLOW &&
                    stepCvid &&
                    stepIndex !== -1 && (
                      <span className="ml-1">
                        , at step: <span className="font-bold">{stepIndex + 1}</span>
                      </span>
                    )}
                </ContentActionsPopoverTrigger>
                <ContentActionsPopoverContent
                  style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT }}
                >
                  <div className=" flex flex-col space-y-2">
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
