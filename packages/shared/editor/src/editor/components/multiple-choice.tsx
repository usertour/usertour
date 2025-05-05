import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-ui/button';
import { Checkbox } from '@usertour-ui/checkbox';
import { CheckboxIcon2, DeleteIcon, PlusIcon } from '@usertour-ui/icons';
import { Input } from '@usertour-ui/input';
import { Label } from '@usertour-ui/label';
import { RadioGroup, RadioGroupItem } from '@usertour-ui/radio-group';
import { Switch } from '@usertour-ui/switch';
import { TooltipContent } from '@usertour-ui/tooltip';
import { Tooltip, TooltipTrigger } from '@usertour-ui/tooltip';
import { TooltipProvider } from '@usertour-ui/tooltip';
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { ContentActions } from '../../actions';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import {
  ContentEditorMultipleChoiceElement,
  ContentEditorMultipleChoiceOption,
} from '../../types/editor';
import { EditorErrorAnchor } from '../../components/editor-error';
import { EditorErrorContent } from '../../components/editor-error';
import { EditorError } from '../../components/editor-error';
import { isEmptyString } from '@usertour-ui/shared-utils';
import { cn } from '@usertour-ui/ui-utils';
import { BindAttribute } from './bind-attribute';
import { BizAttributeTypes } from '@usertour-ui/types';

interface ContentEditorMultipleChoiceProps {
  element: ContentEditorMultipleChoiceElement;
  id: string;
  path: number[];
}

const itemBaseClass =
  'flex items-center overflow-hidden group cursor-pointer relative border bg-sdk-question/10 text-sdk-question border-sdk-question hover:text-sdk-question hover:bg-sdk-question/40  rounded-md main-transition p-2 gap-2 w-auto pr-0 h-8 items-center justify-center min-w-0	';

export const ContentEditorMultipleChoice = (props: ContentEditorMultipleChoiceProps) => {
  const { element, id } = props;
  const {
    updateElement,
    zIndex,
    currentStep,
    currentVersion,
    contentList,
    createStep,
    attributes,
    projectId,
  } = useContentEditorContext();
  const [isShowError, setIsShowError] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>();
  const [localData, setLocalData] = useState(element.data);
  const [shouldUpdate, setShouldUpdate] = useState(false);

  const handleDataChange = useCallback(
    (data: Partial<ContentEditorMultipleChoiceElement['data']>) => {
      setLocalData((prevData) => {
        const newData = { ...prevData, ...data };
        setShouldUpdate(true);
        return newData;
      });
    },
    [],
  );

  useEffect(() => {
    if (shouldUpdate) {
      updateElement(
        {
          ...element,
          data: localData,
        },
        id,
      );
      setShouldUpdate(false);
    }
  }, [shouldUpdate, localData, updateElement, id]);

  useEffect(() => {
    setIsShowError(isEmptyString(localData.name));
  }, [localData.name]);

  const handleOptionChange = useCallback(
    (index: number, field: keyof ContentEditorMultipleChoiceOption, value: string | boolean) => {
      setLocalData((prevData) => {
        const newOptions = [...prevData.options];
        newOptions[index] = { ...newOptions[index], [field]: value };
        setShouldUpdate(true);
        return { ...prevData, options: newOptions };
      });
    },
    [],
  );

  return (
    <EditorError open={isShowError}>
      <EditorErrorAnchor className="w-full">
        <Popover.Root modal={true} onOpenChange={setIsOpen} open={isOpen}>
          <Popover.Trigger asChild>
            <div className="flex flex-col gap-2 w-full">
              <div className="space-y-2">
                {!localData.allowMultiple ? (
                  <RadioGroup defaultValue={localData.options[0].value}>
                    {localData.options.map((option, index) => (
                      <div className={itemBaseClass} key={index}>
                        <RadioGroupItem
                          value={option.value}
                          id={`r1${index}`}
                          className="border-sdk-question data-[state=checked]:bg-sdk-question data-[state=checked]:text-sdk-background"
                        />
                        <Label htmlFor={`r1${index}`} className="cursor-pointer grow">
                          {option.label || option.value}
                        </Label>
                      </div>
                    ))}
                    {localData.enableOther && (
                      <div className={cn(itemBaseClass)}>
                        <RadioGroupItem
                          value="other"
                          id="other-radio"
                          className="border-sdk-question data-[state=checked]:bg-sdk-question data-[state=checked]:text-sdk-background"
                        />
                        <div className="flex items-center grow gap-2 relative">
                          <span className="grow cursor-pointer leading-none">Other...</span>
                        </div>
                      </div>
                    )}
                  </RadioGroup>
                ) : (
                  <div className="flex flex-col gap-2">
                    {localData.options.map((option, index) => (
                      <div className={itemBaseClass} key={index}>
                        <Checkbox
                          checked={option.checked}
                          id={`c1${index}`}
                          className="border-sdk-question data-[state=checked]:bg-sdk-question data-[state=checked]:text-sdk-background"
                          onCheckedChange={(checked) =>
                            handleOptionChange(index, 'checked', checked)
                          }
                        />
                        <Label htmlFor={`c1${index}`} className="grow cursor-pointer text-sm">
                          {option.label || option.value || `Option ${index + 1}`}
                        </Label>
                      </div>
                    ))}
                    {localData.enableOther && (
                      <div className={cn(itemBaseClass)}>
                        <Checkbox className="border-sdk-question data-[state=checked]:bg-sdk-question data-[state=checked]:text-sdk-background" />
                        <div className="flex items-center grow gap-2 relative">
                          <span className="grow cursor-pointer leading-none">Other...</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-center w-full">
                      <Button forSdk={true}>{localData.buttonText || 'Submit'}</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="z-50 w-96 rounded-md border bg-background p-4"
              style={{ zIndex }}
              sideOffset={10}
              side="right"
            >
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="question-name">Question name</Label>
                  <Input
                    id="question-name"
                    value={localData.name}
                    onChange={(e) => handleDataChange({ name: e.target.value })}
                    placeholder="Enter question name"
                  />
                </div>
                <Label>When answer is submitted</Label>
                <ContentActions
                  zIndex={zIndex}
                  isShowIf={false}
                  isShowLogic={false}
                  currentStep={currentStep}
                  currentVersion={currentVersion}
                  onDataChange={(actions) => handleDataChange({ actions })}
                  defaultConditions={localData.actions || []}
                  attributes={attributes}
                  contents={contentList}
                  createStep={createStep}
                />

                <div className="space-y-2">
                  <Label>Options</Label>
                  {localData.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option.value}
                        onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                        placeholder="Value"
                      />
                      <Input
                        value={option.label}
                        onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                        placeholder="Option label"
                      />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              className="flex-none hover:bg-red-200"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDataChange({
                                  options: localData.options.filter((_, i) => i !== index),
                                })
                              }
                            >
                              <DeleteIcon className="fill-red-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">Remove option</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))}

                  <Button
                    onClick={() =>
                      handleDataChange({
                        options: [...localData.options, { label: '', value: '', checked: false }],
                      })
                    }
                    size="sm"
                    variant={'link'}
                    className="hover:no-underline	"
                  >
                    <PlusIcon width={16} height={16} />
                    Add answer option
                  </Button>
                </div>
                {localData.allowMultiple && (
                  <>
                    <Label className="flex items-center gap-1">Number of options required</Label>
                    <div className="flex flex-row gap-2 items-center">
                      <Input
                        type="number"
                        value={localData.lowRange}
                        placeholder="Default"
                        onChange={(e) => handleDataChange({ lowRange: Number(e.target.value) })}
                      />
                      <p>-</p>
                      <Input
                        type="number"
                        value={localData.highRange}
                        placeholder="Default"
                        onChange={(e) => handleDataChange({ highRange: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="button-text">Submit button text</Label>
                      <Input
                        id="button-text"
                        value={localData.buttonText}
                        onChange={(e) => handleDataChange({ buttonText: e.target.value })}
                        placeholder="Enter button text"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="shuffle"
                      checked={localData.shuffleOptions}
                      className="data-[state=unchecked]:bg-muted"
                      onCheckedChange={(checked) => handleDataChange({ shuffleOptions: checked })}
                    />
                    <Label htmlFor="shuffle">Shuffle option order</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="other"
                      checked={localData.enableOther}
                      className="data-[state=unchecked]:bg-muted"
                      onCheckedChange={(checked) => handleDataChange({ enableOther: checked })}
                    />
                    <Label htmlFor="other">Enable "Other" option</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="multiple"
                      checked={localData.allowMultiple}
                      className="data-[state=unchecked]:bg-muted"
                      onCheckedChange={(checked) => handleDataChange({ allowMultiple: checked })}
                    />
                    <Label htmlFor="multiple">Allow multiple selection</Label>
                  </div>
                  <BindAttribute
                    zIndex={zIndex}
                    bindToAttribute={localData.bindToAttribute || false}
                    selectedAttribute={localData.selectedAttribute}
                    onBindChange={(checked) => handleDataChange({ bindToAttribute: checked })}
                    onAttributeChange={(value) => handleDataChange({ selectedAttribute: value })}
                    dataType={
                      localData.allowMultiple ? BizAttributeTypes.List : BizAttributeTypes.String
                    }
                    projectId={projectId}
                  />
                </div>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </EditorErrorAnchor>
      <EditorErrorContent side="bottom" style={{ zIndex }}>
        Question name is required
      </EditorErrorContent>
    </EditorError>
  );
};

ContentEditorMultipleChoice.displayName = 'ContentEditorMultipleChoice';

export const ContentEditorMultipleChoiceSerialize = (props: {
  element: ContentEditorMultipleChoiceElement;
  onClick?: (element: ContentEditorMultipleChoiceElement, value?: any) => void;
}) => {
  const { element, onClick } = props;
  const [otherValue, setOtherValue] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [isOtherChecked, setIsOtherChecked] = useState<boolean>(false);
  const otherInputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => {
    if (element.data.shuffleOptions) {
      return [...element.data.options].sort(() => Math.random() - 0.5);
    }
    return element.data.options;
  }, [element.data.options, element.data.shuffleOptions]);

  if (element.data.allowMultiple) {
    const isValidSelection = () => {
      const count = selectedValues.length + (isOtherChecked && otherValue ? 1 : 0);
      const lowRange = Number(element.data.lowRange) || 0;
      const highRange = Number(element.data.highRange) || options.length;
      return count >= lowRange && count <= highRange;
    };

    const handleOptionClick = (value: string) => {
      setSelectedValues((prev) => {
        if (prev.includes(value)) {
          return prev.filter((v) => v !== value);
        }
        return [...prev, value];
      });
    };

    const handleSubmit = () => {
      if (isValidSelection()) {
        const values = [...selectedValues];
        if (isOtherChecked && otherValue) {
          values.push(otherValue);
        }
        onClick?.(element, values);
      }
    };

    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="space-y-2">
          <div className="flex flex-col gap-2">
            {options.map((option, index) => (
              <div
                className={itemBaseClass}
                key={index}
                onClick={() => handleOptionClick(option.value)}
              >
                <Checkbox
                  checked={selectedValues.includes(option.value)}
                  className="border-sdk-question data-[state=checked]:bg-sdk-question data-[state=checked]:text-sdk-background"
                />
                <span className="grow cursor-pointer text-sm">
                  {option.label || option.value || `Option ${index + 1}`}
                </span>
              </div>
            ))}
            {element.data.enableOther && (
              <div className={cn(itemBaseClass, isEditing && 'hover:bg-transparent')}>
                <Checkbox
                  checked={isOtherChecked}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isOtherChecked) {
                      setOtherValue('');
                      setIsOtherChecked(false);
                    } else {
                      setIsEditing(true);
                      otherInputRef.current?.focus();
                    }
                  }}
                  className="border-sdk-question data-[state=checked]:bg-sdk-question data-[state=checked]:text-sdk-background"
                />
                <div className="flex items-center grow gap-2 relative">
                  {isEditing ? (
                    <input
                      ref={otherInputRef}
                      placeholder="Other..."
                      value={otherValue}
                      onChange={(e) => {
                        setOtherValue(e.target.value);
                        setIsOtherChecked(!!e.target.value);
                      }}
                      className="grow bg-transparent h-3.5 focus:outline-none focus:ring-0"
                    />
                  ) : (
                    <span
                      className="grow cursor-pointer leading-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                    >
                      {otherValue || 'Other...'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-center w-full">
            <Button forSdk={true} disabled={!isValidSelection()} onClick={handleSubmit}>
              {element.data.buttonText || 'Submit'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="space-y-2">
        <div className="flex flex-col gap-2">
          <RadioGroup>
            {options.map((option, index) => (
              <div
                className={itemBaseClass}
                key={index}
                onClick={() => onClick?.(element, option.value)}
              >
                <RadioGroupItem
                  value={option.value}
                  id={`r1${index}`}
                  className="border-sdk-question text-sdk-foreground"
                />
                <Label htmlFor={`r1${index}`} className="grow cursor-pointer text-sm">
                  {option.label || option.value}
                </Label>
              </div>
            ))}
            {element.data.enableOther && (
              <div className={cn(itemBaseClass, isEditing && 'hover:bg-transparent')}>
                <RadioGroupItem
                  value="other"
                  id="other-radio"
                  className="border-sdk-question data-[state=checked]:bg-sdk-question data-[state=checked]:text-sdk-background"
                />
                <div className="flex items-center grow gap-2 relative">
                  {isEditing ? (
                    <>
                      <input
                        ref={otherInputRef}
                        placeholder="Other..."
                        value={otherValue}
                        onChange={(e) => {
                          setOtherValue(e.target.value);
                          setIsOtherChecked(!!e.target.value);
                        }}
                        className="grow bg-transparent h-3.5 focus:outline-none focus:ring-0"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 p-0 m-0 border-none text-sdk-question"
                        onClick={() => {
                          setIsEditing(false);
                          onClick?.(element, otherValue);
                        }}
                      >
                        <CheckboxIcon2 />
                      </Button>
                    </>
                  ) : (
                    <span
                      className="grow cursor-pointer leading-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                    >
                      {otherValue || 'Other...'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </RadioGroup>
        </div>
      </div>
    </div>
  );
};

ContentEditorMultipleChoiceSerialize.displayName = 'ContentEditorMultipleChoiceSerialize';
