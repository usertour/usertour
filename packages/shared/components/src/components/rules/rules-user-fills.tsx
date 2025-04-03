import { TextFillIcon } from '@usertour-ui/icons';
import { useEffect, useState } from 'react';
import { getTextFillError } from '@usertour-ui/shared-utils';
import { ElementSelectorPropsData } from '@usertour-ui/types';
import { useRulesContext } from './rules-context';
import { useRulesGroupContext } from '../contexts/rules-group-context';
import { ElementSelector } from '../selector/element-selector';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesLogic } from './rules-logic';
import { RulesPopover, RulesPopoverContent, RulesPopoverTrigger } from './rules-popper';
import { RulesRemove } from './rules-remove';
import { RulesConditionIcon, RulesConditionRightContent } from './rules-template';

interface RulesUserFillsProps {
  index: number;
  type: string;
  data: {
    elementData: ElementSelectorPropsData;
    logic: string;
    value: string;
  };
}

export const RulesUserFills = (props: RulesUserFillsProps) => {
  const { index, data, type } = props;
  const [elementData, setElementData] = useState<ElementSelectorPropsData>(
    data.elementData || {
      type: 'auto',
      precision: 'strict',
      isDynamicContent: false,
      sequence: '1st',
    },
  );
  const [openError, setOpenError] = useState(false);
  const [open, setOpen] = useState(false);
  const { updateConditionData } = useRulesGroupContext();
  const [errorInfo, setErrorInfo] = useState('');
  const { currentContent, token, onElementChange, disabled } = useRulesContext();

  useEffect(() => {
    if (open) {
      return;
    }
    const updates = {
      elementData,
    };
    const { showError, errorInfo } = getTextFillError(updates);
    setOpenError(showError);
    setErrorInfo(errorInfo);
    updateConditionData(index, updates);
  }, [elementData, open]);

  return (
    <RulesError open={openError}>
      <div className="flex flex-row space-x-3">
        <RulesLogic index={index} disabled={disabled} />
        <RulesErrorAnchor asChild>
          <RulesConditionRightContent disabled={disabled}>
            <RulesConditionIcon>
              <TextFillIcon width={16} height={16} />
            </RulesConditionIcon>
            <RulesPopover onOpenChange={setOpen} open={open}>
              <RulesPopoverTrigger className="space-y-1">
                <div className="grow pr-6 text-sm text-wrap break-all">
                  User fills in this input{' '}
                </div>
                <div>
                  {elementData && elementData.type === 'auto' && elementData.screenshot && (
                    <img
                      className="max-w-32	max-h-16 border rounded"
                      src={elementData.screenshot}
                    />
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
              </RulesPopoverTrigger>
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
        <RulesErrorContent>{errorInfo}</RulesErrorContent>
      </div>
    </RulesError>
  );
};

RulesUserFills.displayName = 'RulesUserFills';
