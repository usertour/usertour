import { EDITOR_RICH_ACTION_CONTENT } from '@usertour-ui/constants';
import { ArrowRightIcon, SpinnerIcon } from '@usertour-ui/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPortal,
  SelectTriggerNoIcon,
  SelectValue,
} from '@usertour-ui/select';
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
  const [open] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // const [stepIndex, setStepIndex] = useState<string | undefined>(
  //   data?.stepIndex
  // );
  const [stepCvid, setStepCvid] = useState<string | undefined>(data?.stepCvid);

  useEffect(() => {
    if (open) {
      return;
    }
    const updates = { stepCvid };
    const { showError, errorInfo } = getStepError(updates);
    setOpenError(showError);
    setErrorInfo(errorInfo);
    updateConditionData(index, updates);
  }, [open, stepCvid]);

  const handleValuChange = useCallback(
    async (value: string) => {
      if (value === 'create') {
        if (createStep && currentVersion) {
          setIsLoading(true);
          const seq = currentStep?.sequence ?? 0;
          const step = await createStep(currentVersion, seq + 1);
          setIsLoading(false);
          if (step) {
            setStepCvid(step.cvid);
          } else {
            //error
            return;
          }
        }
      } else {
        setStepCvid(value);
      }
    },
    [currentVersion, currentStep],
  );

  return (
    <ContentActionsError open={openError}>
      <ActionsConditionRightContent className="w-fit pr-5">
        <ContentActionsErrorAnchor>
          <Select
            defaultValue={stepCvid}
            value={stepCvid}
            onValueChange={handleValuChange}
            disabled={isLoading}
          >
            <SelectTriggerNoIcon className="justify-start flex h-9 border-none focus:outline-none focus:ring-0 px-2 shadow-none	">
              <ContentActionsConditionIcon className="px-0 pr-2">
                <ArrowRightIcon width={16} height={16} />
              </ContentActionsConditionIcon>
              <span className="pr-1">Go to Step</span>{' '}
              {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
              {!isLoading && (
                <div className=" max-w-[120px]	truncate ...">
                  <SelectValue placeholder={''} />
                </div>
              )}
            </SelectTriggerNoIcon>
            <SelectPortal>
              <SelectContent style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT }}>
                {currentVersion?.steps?.map((item, index) => {
                  if (currentStep?.cvid === item.cvid) {
                    return;
                  }
                  return (
                    <SelectItem
                      key={item.cvid}
                      value={item.cvid as string}
                      className="cursor-pointer"
                    >
                      {index + 1}.{item.name}
                    </SelectItem>
                  );
                })}
                <SelectItem value={'create'} className="cursor-pointer">
                  Add new step
                </SelectItem>
              </SelectContent>
            </SelectPortal>
          </Select>
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
