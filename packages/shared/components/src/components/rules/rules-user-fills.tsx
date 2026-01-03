import { TextFillIcon } from '@usertour-packages/icons';
import { useCallback, useEffect, useState } from 'react';
import { getTextFillError } from '@usertour/helpers';
import { ElementSelectorPropsData } from '@usertour/types';
import { useRulesContext, useRulesZIndex } from './rules-context';
import { useRulesGroupContext } from '../contexts/rules-group-context';
import { ElementSelector } from '../selector/element-selector';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesPopover, RulesPopoverContent } from './rules-popper';
import { RulesPopoverTriggerWrapper } from './rules-wrapper';
import { RulesRemove } from './rules-remove';
import { RulesConditionRightContent } from './rules-template';
import { useAutoOpenPopover } from './use-auto-open-popover';

interface RulesUserFillsProps {
  index: number;
  type: string;
  data: {
    elementData: ElementSelectorPropsData;
    logic: string;
    value: string;
  };
  conditionId?: string;
}

export const RulesUserFills = (props: RulesUserFillsProps) => {
  const { index, data, type, conditionId } = props;
  const [elementData, setElementData] = useState<ElementSelectorPropsData>(
    data.elementData || {
      type: 'auto',
      precision: 'strict',
      isDynamicContent: false,
      sequence: '1st',
    },
  );
  const [openError, setOpenError] = useState(false);
  const [open, setOpen] = useAutoOpenPopover(conditionId);
  const { updateConditionData } = useRulesGroupContext();
  const [errorInfo, setErrorInfo] = useState('');
  const { currentContent, token, onElementChange, disabled } = useRulesContext();
  const { error: errorZIndex } = useRulesZIndex();

  useEffect(() => {
    if (open) {
      setOpenError(false);
      setErrorInfo('');
      return;
    }
    const updates = {
      elementData,
    };
    const { showError, errorInfo } = getTextFillError(updates);
    if (showError) {
      setOpenError(showError);
      setErrorInfo(errorInfo);
    }
  }, [elementData, open, setErrorInfo, setOpenError]);

  const handleOnOpenChange = useCallback(
    (open: boolean) => {
      setOpen(open);
      if (open) {
        setErrorInfo('');
        setOpenError(false);
        return;
      }
      const updates = {
        elementData,
      };
      const { showError, errorInfo } = getTextFillError(updates);
      if (showError) {
        setOpenError(showError);
        setErrorInfo(errorInfo);
        return;
      }
      updateConditionData(index, updates);
    },
    [elementData, index, updateConditionData, setErrorInfo, setOpenError],
  );

  return (
    <RulesError open={openError}>
      <RulesErrorAnchor asChild>
        <RulesConditionRightContent disabled={disabled}>
          <RulesPopover onOpenChange={handleOnOpenChange} open={open}>
            <RulesPopoverTriggerWrapper
              className="space-y-1"
              icon={<TextFillIcon width={16} height={16} />}
            >
              <div className="grow pr-6 text-sm text-wrap break-all">User fills in this input </div>
              <div>
                {elementData && elementData.type === 'auto' && elementData.screenshot && (
                  <img className="max-w-32	max-h-16 border rounded" src={elementData.screenshot} />
                )}
                {elementData &&
                  elementData.type === 'manual' &&
                  (elementData.content || elementData.customSelector) && (
                    <span className="font-bold space-x-1">
                      {elementData.content} {elementData.customSelector}
                    </span>
                  )}
                {elementData &&
                  elementData.type === 'manual' &&
                  elementData.content === '' &&
                  elementData.customSelector === '' && (
                    <span className="font-bold text-destructive">No element selected yet</span>
                  )}
              </div>
            </RulesPopoverTriggerWrapper>
            <RulesPopoverContent side="right">
              <div className=" flex flex-col space-y-2">
                <div>If user fills in this input</div>
                {/* <RulesUserFillsSelector /> */}
                <ElementSelector
                  data={{
                    ...elementData,
                    type: elementData?.type || 'auto',
                  }}
                  onDataChange={setElementData}
                  isInput={true}
                  currentContent={currentContent}
                  token={token}
                  onElementChange={
                    onElementChange
                      ? () => {
                          if (onElementChange) onElementChange(index, type);
                        }
                      : undefined
                  }
                />
              </div>
            </RulesPopoverContent>
          </RulesPopover>
          <RulesRemove index={index} />
        </RulesConditionRightContent>
      </RulesErrorAnchor>
      <RulesErrorContent zIndex={errorZIndex}>{errorInfo}</RulesErrorContent>
    </RulesError>
  );
};

RulesUserFills.displayName = 'RulesUserFills';
