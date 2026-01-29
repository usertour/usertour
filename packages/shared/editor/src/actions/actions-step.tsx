import { EDITOR_RICH_ACTION_CONTENT } from '@usertour-packages/constants';
import {
  ArrowRightIcon,
  EyeNoneIcon,
  ModelIcon,
  RiMessageFill,
  SpinnerIcon,
  TooltipIcon,
} from '@usertour-packages/icons';
import { Badge } from '@usertour-packages/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuItem,
  DropdownMenuSelectItem,
} from '@usertour-packages/dropdown-menu';
import { getStepError } from '@usertour/helpers';
import { Step, ContentVersion, StepContentType } from '@usertour/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useActionsGroupContext } from '../contexts/actions-group-context';
import { useContentActionsContext } from '../contexts/content-actions-context';
import {
  ContentActionsError,
  ContentActionsErrorAnchor,
  ContentActionsErrorContent,
} from './actions-error';
import { ContentActionsRemove } from './actions-remove';
import { ActionsConditionRightContent, ContentActionsConditionIcon } from './actions-template';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { cn } from '@usertour-packages/tailwind';
import { useAutoOpenPopover } from './use-auto-open-popover';

export interface ContentActionsStepProps {
  data?: {
    logic: string;
    type: string;
    // stepIndex: string;
    stepCvid: string;
  };
  type: string;
  index: number;
  conditionId?: string;
}

// Get step type icon
const getStepTypeIcon = (type: string) => {
  switch (type) {
    case StepContentType.BUBBLE:
      return <RiMessageFill className="w-4 h-4 mr-1" />;
    case StepContentType.TOOLTIP:
      return <TooltipIcon className="w-4 h-4 mt-1 mr-1" />;
    case StepContentType.MODAL:
      return <ModelIcon className="w-4 h-4 mt-0.5 mr-1" />;
    case StepContentType.HIDDEN:
      return <EyeNoneIcon className="w-4 h-4 mr-1" />;
    default:
      return null;
  }
};

// Custom hook for step error handling
const useStepErrorHandling = (
  stepCvid: string | undefined,
  open: boolean,
  currentVersion: ContentVersion | undefined,
) => {
  const [openError, setOpenError] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');

  useEffect(() => {
    const updates = { stepCvid };
    const { showError, errorInfo } = getStepError(updates);

    // Additional check: if stepCvid is set but the step doesn't exist in currentVersion.steps
    let finalShowError = showError;
    let finalErrorInfo = errorInfo;

    if (stepCvid && currentVersion?.steps) {
      const stepExists = currentVersion.steps.some((step: Step) => step.cvid === stepCvid);
      if (!stepExists) {
        finalShowError = true;
        finalErrorInfo = 'Selected step no longer exists';
      }
    }

    if (finalShowError && !open) {
      setErrorInfo(finalErrorInfo);
      setOpenError(true);
    }
  }, [open, stepCvid, currentVersion]);

  return { openError, setOpenError, errorInfo, setErrorInfo };
};

// Custom hook for step actions
const useStepActions = (
  currentVersion: ContentVersion | undefined,
  currentStep: Step | undefined,
  createStep:
    | ((
        currentVersion: ContentVersion,
        sequence: number,
        stepType?: string,
        duplicateStep?: Step,
      ) => Promise<Step | undefined>)
    | undefined,
) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleStepAction = useCallback(
    async (stepType?: string, stepToDuplicate?: Step) => {
      if (createStep && currentVersion) {
        setIsLoading(true);
        const seq = currentStep?.sequence ?? 0;
        const step = await createStep(currentVersion, seq + 1, stepType, stepToDuplicate);
        setIsLoading(false);
        if (step?.cvid) {
          return step.cvid;
        }
      }
      return null;
    },
    [currentVersion, currentStep, createStep],
  );

  const handleCreateStep = useCallback(
    async (stepType?: string) => {
      const newStepCvid = await handleStepAction(stepType);
      return newStepCvid;
    },
    [handleStepAction],
  );

  const handleDuplicateStep = useCallback(
    async (cvid: string) => {
      const selectedStep = currentVersion?.steps?.find((step: Step) => step.cvid === cvid);
      if (selectedStep) {
        const newStepCvid = await handleStepAction(undefined, selectedStep);
        return newStepCvid;
      }
      return null;
    },
    [currentVersion, handleStepAction],
  );

  return { isLoading, handleCreateStep, handleDuplicateStep };
};

// Memoized step item component
const StepItem = ({
  item,
  index,
  onSelect,
}: {
  item: Step;
  index: number;
  onSelect: () => void;
}) => {
  return (
    <DropdownMenuSelectItem
      key={item.cvid}
      value={item.cvid as string}
      onSelect={onSelect}
      className="cursor-pointer"
    >
      <div className="flex items-center w-full min-w-0">
        {getStepTypeIcon(item.type)}
        <span className="flex-shrink-0 mr-1">{index + 1}.</span>
        <span className="truncate min-w-0">{item.name}</span>
      </div>
    </DropdownMenuSelectItem>
  );
};

// Memoized duplicate step item component
const DuplicateStepItem = ({
  item,
  index,
  onSelect,
  isCurrentStep = false,
}: {
  item: Step;
  index: number;
  onSelect: () => void;
  isCurrentStep?: boolean;
}) => {
  return (
    <DropdownMenuItem key={item.cvid} className="cursor-pointer" onSelect={onSelect}>
      <div className="flex items-center w-full min-w-0">
        {getStepTypeIcon(item.type)}
        <span className="flex-shrink-0 mr-1">{index + 1}.</span>
        <span className="truncate min-w-0">{item.name}</span>
        {isCurrentStep && (
          <Badge variant="secondary" className="ml-2 flex-shrink-0">
            Current
          </Badge>
        )}
      </div>
    </DropdownMenuItem>
  );
};

// Memoized display text component
const StepDisplayText = ({
  currentVersion,
  stepCvid,
}: { currentVersion: ContentVersion | undefined; stepCvid: string | undefined }) => {
  const displayText = useMemo(() => {
    const selectedStep = currentVersion?.steps?.find((step: Step) => step.cvid === stepCvid);
    if (selectedStep) {
      const stepIndex =
        currentVersion?.steps?.findIndex((step: Step) => step.cvid === stepCvid) ?? 0;
      return `${stepIndex + 1}. ${selectedStep.name}`;
    }
    return '';
  }, [currentVersion, stepCvid]);

  return (
    <div className="max-w-[100px] truncate flex items-center">
      <span className="truncate">{displayText}</span>
    </div>
  );
};

export const ContentActionsStep = (props: ContentActionsStepProps) => {
  const { index, data, conditionId } = props;
  const { updateConditionData } = useActionsGroupContext();
  const { currentVersion, zIndex, currentStep, createStep } = useContentActionsContext();

  const [open, setOpen] = useAutoOpenPopover(conditionId);
  const [stepCvid, setStepCvid] = useState<string | undefined>(data?.stepCvid);

  // Handle error state
  const { openError, setOpenError, errorInfo, setErrorInfo } = useStepErrorHandling(
    stepCvid,
    open,
    currentVersion,
  );

  // Handle step actions
  const { isLoading, handleCreateStep, handleDuplicateStep } = useStepActions(
    currentVersion,
    currentStep,
    createStep,
  );

  const handleSelectStep = useCallback(
    (cvid: string) => {
      setStepCvid(cvid);
      updateConditionData(index, { stepCvid: cvid });
      setErrorInfo('');
      setOpenError(false);
      setOpen(false);
    },
    [updateConditionData, index, setErrorInfo, setOpenError],
  );

  const handleCreateStepWrapper = useCallback(
    async (stepType?: string) => {
      const newStepCvid = await handleCreateStep(stepType);
      if (newStepCvid) {
        handleSelectStep(newStepCvid);
      }
    },
    [handleCreateStep, handleSelectStep],
  );

  const handleDuplicateStepWrapper = useCallback(
    async (cvid: string) => {
      const newStepCvid = await handleDuplicateStep(cvid);
      if (newStepCvid) {
        handleSelectStep(newStepCvid);
      }
    },
    [handleDuplicateStep, handleSelectStep],
  );

  const handleOnOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        setErrorInfo('');
        setOpenError(false);
      }
    },
    [setErrorInfo, setOpenError],
  );

  // Memoize filtered steps (excluding current step)
  const availableSteps = useMemo(
    () => currentVersion?.steps?.filter((item: Step) => currentStep?.cvid !== item.cvid) || [],
    [currentVersion?.steps, currentStep?.cvid],
  );

  // Memoize trigger content
  const triggerContent = useMemo(
    () => (
      <div className="flex h-9 w-full items-center justify-between rounded-md bg-transparent py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 justify-start flex border-none focus:outline-none focus:ring-0 px-2 shadow-none">
        <ContentActionsConditionIcon className="px-0 pr-2">
          <ArrowRightIcon width={16} height={16} />
        </ContentActionsConditionIcon>
        <span className="pr-1">Go to Step</span>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && <StepDisplayText currentVersion={currentVersion} stepCvid={stepCvid} />}
      </div>
    ),
    [isLoading, currentVersion, stepCvid],
  );

  // Memoize dropdown content
  const dropdownContent = useMemo(
    () => (
      <DropdownMenuRadioGroup value={stepCvid}>
        <ScrollArea className={cn(availableSteps.length > 9 ? 'h-72' : '')}>
          {availableSteps.map((item: Step) => {
            // Find the real step index in the original steps array
            const realStepIndex =
              currentVersion?.steps?.findIndex((step: Step) => step.cvid === item.cvid) ?? 0;
            return (
              <StepItem
                key={item.cvid}
                item={item}
                index={realStepIndex}
                onSelect={() => handleSelectStep(item.cvid as string)}
              />
            );
          })}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">Add new step</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => handleCreateStepWrapper(StepContentType.BUBBLE)}
              >
                <RiMessageFill className="w-4 h-4 mr-1 flex-none" />
                Speech Bubble
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => handleCreateStepWrapper(StepContentType.TOOLTIP)}
              >
                <TooltipIcon className="w-4 h-4 mr-1 mt-1 flex-none" />
                Tooltip
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => handleCreateStepWrapper(StepContentType.MODAL)}
              >
                <ModelIcon className="w-4 h-4 mr-1 mt-0.5 flex-none" />
                Modal
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => handleCreateStepWrapper(StepContentType.HIDDEN)}
              >
                <EyeNoneIcon className="w-4 h-4 mr-1 flex-none" />
                Hidden
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              Duplicate step
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-[240px]">
              <ScrollArea
                className={cn(
                  currentVersion?.steps?.length && currentVersion?.steps?.length > 9 ? 'h-72' : '',
                )}
              >
                {currentVersion?.steps?.map((item: Step, index: number) => (
                  <DuplicateStepItem
                    key={item.cvid}
                    item={item}
                    index={index}
                    onSelect={() => item.cvid && handleDuplicateStepWrapper(item.cvid)}
                    isCurrentStep={currentStep?.cvid === item.cvid}
                  />
                ))}
              </ScrollArea>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </ScrollArea>
      </DropdownMenuRadioGroup>
    ),
    [
      stepCvid,
      availableSteps,
      handleSelectStep,
      handleCreateStepWrapper,
      currentVersion?.steps,
      currentStep?.cvid,
      handleDuplicateStepWrapper,
    ],
  );

  return (
    <ContentActionsError open={openError}>
      <ActionsConditionRightContent className="w-fit pr-5">
        <ContentActionsErrorAnchor>
          <DropdownMenu onOpenChange={handleOnOpenChange} open={open}>
            <DropdownMenuTrigger asChild disabled={isLoading}>
              {triggerContent}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT }}
              className="w-[240px]"
            >
              {dropdownContent}
            </DropdownMenuContent>
          </DropdownMenu>
          <ContentActionsRemove index={index} />
        </ContentActionsErrorAnchor>
      </ActionsConditionRightContent>
      <ContentActionsErrorContent style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT + 3 }}>
        {errorInfo}
      </ContentActionsErrorContent>
    </ContentActionsError>
  );
};

ContentActionsStep.displayName = 'ContentActionsStep';
