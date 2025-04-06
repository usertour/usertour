import { Label } from '@usertour-ui//label';
import { ElementIcon } from '@usertour-ui/icons';
import { RadioGroup, RadioGroupItem } from '@usertour-ui/radio-group';
import { Dispatch, SetStateAction, createContext, useContext, useEffect, useState } from 'react';
import { getElementError } from '@usertour-ui/shared-utils';
import { ElementSelectorPropsData } from '@usertour-ui/types';
import { useRulesContext } from './rules-context';
import { useRulesGroupContext } from '../contexts/rules-group-context';
import { ElementSelector } from '../selector/element-selector';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesLogic } from './rules-logic';
import { RulesPopover, RulesPopoverContent, RulesPopoverTrigger } from './rules-popper';
import { RulesRemove } from './rules-remove';
import { RulesConditionIcon, RulesConditionRightContent } from './rules-template';

interface RulesElementProps {
  index: number;
  type: string;
  data: {
    elementData: ElementSelectorPropsData;
    logic: string;
  };
}

const conditions = [
  { value: 'present', name: 'is present' },
  { value: 'unpresent', name: 'is not present' },
  { value: 'disabled', name: 'is disabled' },
  { value: 'undisabled', name: 'is not disabled' },
  { value: 'clicked', name: 'is clicked' },
  { value: 'unclicked', name: 'is not clicked' },
];

interface RulesElementContextValue {
  conditionValue: string;
  setConditionValue: Dispatch<SetStateAction<string>>;
  elementData: ElementSelectorPropsData;
  setElementData: Dispatch<SetStateAction<ElementSelectorPropsData>>;
}

const RulesElementContext = createContext<RulesElementContextValue | undefined>(undefined);

function useRulesElementContext(): RulesElementContextValue {
  const context = useContext(RulesElementContext);
  if (!context) {
    throw new Error('useRulesElementContext must be used within a RulesElementContext.');
  }
  return context;
}

const RulesElementRadios = () => {
  const { conditionValue = 'present', setConditionValue } = useRulesElementContext();
  return (
    <RadioGroup defaultValue={conditionValue} onValueChange={setConditionValue}>
      {conditions.map((condition, index) => (
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

const defaultData = {
  logic: 'present',
  elementData: {
    type: 'auto',
    precision: 'strict',
    isDynamicContent: false,
    sequence: '1st',
  },
};

export const RulesElement = (props: RulesElementProps) => {
  const { index, data, type } = props;
  const [conditionValue, setConditionValue] = useState(data.logic || defaultData.logic);
  const [elementData, setElementData] = useState<ElementSelectorPropsData>(
    data.elementData || defaultData.elementData,
  );
  const [openError, setOpenError] = useState(false);
  const [open, setOpen] = useState(false);
  const { updateConditionData } = useRulesGroupContext();
  const [errorInfo, setErrorInfo] = useState('');
  const { currentContent, token, onElementChange, disabled } = useRulesContext();

  const value = {
    conditionValue,
    setConditionValue,
    elementData,
    setElementData,
  };

  useEffect(() => {
    if (open) {
      return;
    }
    const updates = {
      logic: conditionValue,
      elementData,
    };
    const { showError, errorInfo } = getElementError(updates);
    setOpenError(showError);
    setErrorInfo(errorInfo);
    updateConditionData(index, updates);
  }, [conditionValue, elementData, open]);

  return (
    <RulesElementContext.Provider value={value}>
      <RulesError open={openError}>
        <div className="flex flex-row space-x-3">
          <RulesLogic index={index} disabled={disabled} />
          <RulesErrorAnchor asChild>
            <RulesConditionRightContent disabled={disabled}>
              <RulesConditionIcon>
                <ElementIcon width={16} height={16} />
              </RulesConditionIcon>
              <RulesPopover onOpenChange={setOpen} open={open}>
                <RulesPopoverTrigger className="space-y-1">
                  <div className="grow pr-6 text-sm text-wrap break-all space-y-1">
                    If this element{' '}
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
                  <div>{conditions.find((c) => c.value === conditionValue)?.name} </div>
                </RulesPopoverTrigger>
                <RulesPopoverContent side="right">
                  <div className=" flex flex-col space-y-2">
                    <div>If this element...</div>
                    {/* <RulesElementSelector /> */}
                    <ElementSelector
                      data={{ ...elementData }}
                      onDataChange={setElementData}
                      currentContent={currentContent}
                      onElementChange={
                        onElementChange
                          ? () => {
                              if (onElementChange) onElementChange(index, type);
                            }
                          : undefined
                      }
                      token={token}
                    />
                    <RulesElementRadios />
                  </div>
                </RulesPopoverContent>
              </RulesPopover>
              <RulesRemove index={index} />
            </RulesConditionRightContent>
          </RulesErrorAnchor>
          <RulesErrorContent>{errorInfo}</RulesErrorContent>
        </div>
      </RulesError>
    </RulesElementContext.Provider>
  );
};

RulesElement.displayName = 'RulesElement';
