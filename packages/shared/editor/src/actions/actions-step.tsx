import { EDITOR_RICH_ACTION_CONTENT } from '@usertour-ui/constants';
import {
  ArrowRightIcon,
  EyeNoneIcon,
  ModelIcon,
  SpinnerIcon,
  TooltipIcon,
} from '@usertour-ui/icons';
import { Badge } from '@usertour-ui/badge';
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
} from '@usertour-ui/dropdown-menu';
import { getStepError } from '@usertour-ui/shared-utils';
import { useCallback, useEffect, useState } from 'react';
import { useActionsGroupContext } from '../contexts/actions-group-context';
import { useContentActionsContext } from '../contexts/content-actions-context';
import {
  ContentActionsError,
  ContentActionsErrorAnchor,
  ContentActionsErrorContent,
} from './actions-error';
import { ContentActionsRemove } from './actions-remove';
import { ActionsConditionRightContent, ContentActionsConditionIcon } from './actions-template';

export interface ContentActionsStepProps {
  data?: {
    logic: string;
    type: string;
    // stepIndex: string;
    stepCvid: string;
  };
  type: string;
  index: number;
}

export const ContentActionsStep = (props: ContentActionsStepProps) => {
  const { index, data } = props;
  const { updateConditionData } = useActionsGroupContext();
  const { currentVersion, zIndex, currentStep, createStep } = useContentActionsContext();
  const [openError, setOpenError] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stepCvid, setStepCvid] = useState<string | undefined>(data?.stepCvid);

  useEffect(() => {
    const updates = { stepCvid };
    const { showError, errorInfo } = getStepError(updates);

    // Additional check: if stepCvid is set but the step doesn't exist in currentVersion.steps
    let finalShowError = showError;
    let finalErrorInfo = errorInfo;

    if (stepCvid && currentVersion?.steps) {
      const stepExists = currentVersion.steps.some((step) => step.cvid === stepCvid);
      if (!stepExists) {
        finalShowError = true;
        finalErrorInfo = 'Selected step no longer exists';
      }
    }

    if (finalShowError && !open) {
      setErrorInfo(finalErrorInfo);
      setOpenError(true);
    }
  }, [open, stepCvid, currentVersion, setErrorInfo, setOpenError]);

  const handleStepAction = useCallback(
    async (stepType?: string, stepToDuplicate?: any) => {
      if (createStep && currentVersion) {
        setIsLoading(true);
        const seq = currentStep?.sequence ?? 0;
        const step = await createStep(currentVersion, seq + 1, stepType, stepToDuplicate);
        setIsLoading(false);
        if (step) {
          setStepCvid(step.cvid);
          updateConditionData(index, { stepCvid: step.cvid });
        } else {
          //error
          return;
        }
      }
    },
    [currentVersion, currentStep, createStep, updateConditionData, index],
  );

  const handleCreateStep = useCallback(
    async (stepType?: string) => {
      await handleStepAction(stepType);
    },
    [handleStepAction],
  );

  const handleDuplicateStep = useCallback(
    async (cvid: string) => {
      const selectedStep = currentVersion?.steps?.find((step) => step.cvid === cvid);
      if (selectedStep) {
        await handleStepAction(undefined, selectedStep);
      }
    },
    [currentVersion, handleStepAction],
  );

  // Get display text for selected step
  const getDisplayText = useCallback(() => {
    const selectedStep = currentVersion?.steps?.find((step) => step.cvid === stepCvid);
    if (selectedStep) {
      const stepIndex = currentVersion?.steps?.findIndex((step) => step.cvid === stepCvid) ?? 0;
      return `${stepIndex + 1}. ${selectedStep.name}`;
    }

    return '';
  }, [currentVersion, stepCvid]);

  const handleSelectStep = (cvid: string) => {
    setStepCvid(cvid);
    updateConditionData(index, { stepCvid: cvid });
  };

  const handleOnOpenChange = useCallback((open: boolean) => {
    setOpen(open);
    if (open) {
      setErrorInfo('');
      setOpenError(false);
    }
  }, []);

  return (
    <ContentActionsError open={openError}>
      <ActionsConditionRightContent className="w-fit pr-5">
        <ContentActionsErrorAnchor>
          <DropdownMenu onOpenChange={handleOnOpenChange} open={open}>
            <DropdownMenuTrigger asChild disabled={isLoading}>
              <div className="flex h-9 w-full items-center justify-between rounded-md bg-transparent py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 justify-start flex border-none focus:outline-none focus:ring-0 px-2 shadow-none">
                <ContentActionsConditionIcon className="px-0 pr-2">
                  <ArrowRightIcon width={16} height={16} />
                </ContentActionsConditionIcon>
                <span className="pr-1">Go to Step</span>
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {!isLoading && (
                  <div className="max-w-[100px] truncate flex items-center ">
                    <span className="truncate">{getDisplayText()}</span>
                  </div>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT }}
              className="w-[240px]"
            >
              <DropdownMenuRadioGroup value={stepCvid}>
                {currentVersion?.steps?.map((item, index) => {
                  if (currentStep?.cvid === item.cvid) {
                    return null;
                  }
                  return (
                    <DropdownMenuSelectItem
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
                    </DropdownMenuSelectItem>
                  );
                })}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    Add new step
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => handleCreateStep('hidden')}
                    >
                      <EyeNoneIcon className="w-4 h-4 mr-1 flex-none" />
                      Hidden
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => handleCreateStep('tooltip')}
                    >
                      <TooltipIcon className="w-4 h-4 mr-1 mt-1 flex-none" />
                      Tooltip
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => handleCreateStep('modal')}
                    >
                      <ModelIcon className="w-4 h-4 mr-1 mt-0.5 flex-none" />
                      Modal
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    Duplicate step
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-[240px]">
                    {currentVersion?.steps?.map((item, index) => (
                      <DropdownMenuItem
                        key={item.cvid}
                        className="cursor-pointer"
                        onSelect={() => item.cvid && handleDuplicateStep(item.cvid)}
                      >
                        <div className="flex items-center w-full min-w-0">
                          {item.type === 'hidden' && <EyeNoneIcon className="w-4 h-4 mr-1" />}
                          {item.type === 'tooltip' && <TooltipIcon className="w-4 h-4 mt-1 mr-1" />}
                          {item.type === 'modal' && <ModelIcon className="w-4 h-4 mt-0.5 mr-1" />}
                          <span className="flex-shrink-0 mr-1">{index + 1}.</span>
                          <span className="truncate min-w-0">{item.name}</span>
                          {currentStep?.cvid === item.cvid && (
                            <Badge variant="secondary" className="ml-2 flex-shrink-0">
                              Current
                            </Badge>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuRadioGroup>
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
