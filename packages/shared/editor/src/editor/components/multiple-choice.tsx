import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-packages/button';
import { Checkbox } from '@usertour-packages/checkbox';
import { CheckboxIcon2, DeleteIcon, PlusIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { RadioGroup, RadioGroupItem } from '@usertour-packages/radio-group';
import { Switch } from '@usertour-packages/switch';
import { TooltipContent } from '@usertour-packages/tooltip';
import { Tooltip, TooltipTrigger } from '@usertour-packages/tooltip';
import { TooltipProvider } from '@usertour-packages/tooltip';
import { useCallback, useEffect, useState, useMemo, useRef, memo } from 'react';
import { ContentActions } from '../../actions';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import {
  ContentEditorMultipleChoiceElement,
  ContentEditorMultipleChoiceOption,
} from '../../types/editor';
import { EditorErrorAnchor } from '../../components/editor-error';
import { EditorErrorContent } from '../../components/editor-error';
import { EditorError } from '../../components/editor-error';
import { isEmptyString } from '@usertour/helpers';
import { cn } from '@usertour-packages/tailwind';
import { BindAttribute } from './bind-attribute';
import { BizAttributeTypes } from '@usertour/types';

// Constants
const DEFAULT_BUTTON_TEXT = 'Submit';
const DEFAULT_OPTION_PREFIX = 'Option';

interface ContentEditorMultipleChoiceProps {
  element: ContentEditorMultipleChoiceElement;
  id: string;
  path: number[];
}

const itemBaseClass =
  'flex items-center overflow-hidden group cursor-pointer relative border bg-sdk-question/10 text-sdk-question border-sdk-question hover:text-sdk-question hover:bg-sdk-question/40 rounded-md main-transition p-2 gap-2 w-auto pr-0 h-8 items-center justify-center min-w-0';

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
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [localData, setLocalData] = useState(element.data);
  const [openError, setOpenError] = useState(false);

  const handleDataChange = useCallback(
    (data: Partial<ContentEditorMultipleChoiceElement['data']>) => {
      setLocalData((prevData) => ({ ...prevData, ...data }));
    },
    [],
  );

  useEffect(() => {
    setOpenError(isEmptyString(localData.name) && !isOpen);
  }, [localData.name, isOpen]);

  const handleOptionChange = useCallback(
    (index: number, field: keyof ContentEditorMultipleChoiceOption, value: string | boolean) => {
      setLocalData((prevData) => {
        const newOptions = [...prevData.options];
        newOptions[index] = { ...newOptions[index], [field]: value };
        return { ...prevData, options: newOptions };
      });
    },
    [],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        setOpenError(false);
        return;
      }
      if (isEmptyString(localData.name)) {
        setOpenError(true);
        return;
      }

      // Only update if data has changed
      if (JSON.stringify(localData) !== JSON.stringify(element.data)) {
        updateElement(
          {
            ...element,
            data: localData,
          },
          id,
        );
      }
    },
    [localData, element, id, updateElement],
  );

  // Memoize radio options
  const radioOptions = useMemo(
    () =>
      localData.options.map((option, index) => (
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
      )),
    [localData.options],
  );

  // Memoize checkbox options
  const checkboxOptions = useMemo(
    () =>
      localData.options.map((option, index) => (
        <div className={itemBaseClass} key={index}>
          <Checkbox
            checked={option.checked}
            id={`c1${index}`}
            className="border-sdk-question data-[state=checked]:bg-sdk-question data-[state=checked]:text-sdk-background"
            onCheckedChange={(checked) => handleOptionChange(index, 'checked', checked)}
          />
          <Label htmlFor={`c1${index}`} className="grow cursor-pointer text-sm">
            {option.label || option.value || `${DEFAULT_OPTION_PREFIX} ${index + 1}`}
          </Label>
        </div>
      )),
    [localData.options, handleOptionChange],
  );

  return (
    <EditorError open={openError}>
      <EditorErrorAnchor className="w-full">
        <Popover.Root onOpenChange={handleOpenChange} open={isOpen}>
          <Popover.Trigger asChild>
            <div className="flex flex-col gap-2 w-full">
              <div className="space-y-2">
                {!localData.allowMultiple ? (
                  <RadioGroup defaultValue={localData.options[0]?.value}>
                    {radioOptions}
                    {localData.enableOther && (
                      <div className={cn(itemBaseClass)}>
                        <RadioGroupItem
                          value="other"
                          id="other-radio"
                          className="border-sdk-question data-[state=checked]:bg-sdk-question data-[state=checked]:text-sdk-background"
                        />
                        <div className="flex items-center grow gap-2 relative">
                          <span className="grow cursor-pointer leading-none">
                            {localData.otherPlaceholder || 'Other...'}
                          </span>
                        </div>
                      </div>
                    )}
                  </RadioGroup>
                ) : (
                  <div className="flex flex-col gap-2">
                    {checkboxOptions}
                    {localData.enableOther && (
                      <div className={cn(itemBaseClass)}>
                        <Checkbox className="border-sdk-question data-[state=checked]:bg-sdk-question data-[state=checked]:text-sdk-background" />
                        <div className="flex items-center grow gap-2 relative">
                          <span className="grow cursor-pointer leading-none">
                            {localData.otherPlaceholder || 'Other...'}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-center w-full">
                      <Button forSdk={true}>{localData.buttonText || DEFAULT_BUTTON_TEXT}</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="z-50 w-96 rounded-md border bg-background p-4 shadow-lg"
              style={{ zIndex }}
              sideOffset={10}
              side="right"
            >
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="question-name">Question name</Label>
                  <Input
                    id="question-name"
                    value={localData.name || ''}
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
                    className="hover:no-underline"
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
                  {localData.enableOther && (
                    <div className="space-y-2 ml-8">
                      <Label htmlFor="other-placeholder">Other option placeholder</Label>
                      <Input
                        id="other-placeholder"
                        value={localData.otherPlaceholder || ''}
                        onChange={(e) => handleDataChange({ otherPlaceholder: e.target.value })}
                        placeholder="Other..."
                      />
                    </div>
                  )}

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
                    popoverContentClassName="w-[350px]"
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

// Memoized Other Option component for serialize
const OtherOptionSerialize = memo(
  ({
    element,
    isEditing,
    otherValue,
    setOtherValue,
    setIsOtherChecked,
    setIsEditing,
    otherInputRef,
    onClick,
    itemBaseClass,
  }: {
    element: ContentEditorMultipleChoiceElement;
    isEditing: boolean;
    otherValue: string;
    setOtherValue: (value: string) => void;
    setIsOtherChecked: (value: boolean) => void;
    setIsEditing: (value: boolean) => void;
    otherInputRef: React.RefObject<HTMLInputElement>;
    onClick?: (element: ContentEditorMultipleChoiceElement, value?: any) => void;
    itemBaseClass: string;
  }) => (
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
              placeholder={element.data.otherPlaceholder || 'Other...'}
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
            {otherValue || element.data.otherPlaceholder || 'Other...'}
          </span>
        )}
      </div>
    </div>
  ),
);

OtherOptionSerialize.displayName = 'OtherOptionSerialize';

export const ContentEditorMultipleChoiceSerialize = memo(
  (props: {
    element: ContentEditorMultipleChoiceElement;
    onClick?: (element: ContentEditorMultipleChoiceElement, value?: any) => Promise<void> | void;
  }) => {
    const { element, onClick } = props;
    const [otherValue, setOtherValue] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [selectedValues, setSelectedValues] = useState<string[]>([]);
    const [isOtherChecked, setIsOtherChecked] = useState<boolean>(false);
    const otherInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);

    const options = useMemo(() => {
      if (element.data.shuffleOptions) {
        return [...element.data.options].sort(() => Math.random() - 0.5);
      }
      return element.data.options;
    }, [element.data.options, element.data.shuffleOptions]);

    if (element.data.allowMultiple) {
      const isValidSelection = useCallback(() => {
        const count = selectedValues.length + (isOtherChecked && otherValue ? 1 : 0);
        const lowRange = Number(element.data.lowRange) || 0;
        // When enableOther is true, the max selectable count should include the "Other" option
        const maxOptions = options.length + (element.data.enableOther ? 1 : 0);
        const highRange = Number(element.data.highRange) || maxOptions;
        return count >= lowRange && count <= highRange;
      }, [
        selectedValues.length,
        isOtherChecked,
        otherValue,
        element.data.lowRange,
        element.data.highRange,
        element.data.enableOther,
        options.length,
      ]);

      const handleOptionClick = useCallback((value: string) => {
        setSelectedValues((prev) => {
          if (prev.includes(value)) {
            return prev.filter((v) => v !== value);
          }
          return [...prev, value];
        });
      }, []);

      const handleSubmit = useCallback(async () => {
        if (isValidSelection() && onClick) {
          setLoading(true);
          try {
            const values = [...selectedValues];
            if (isOtherChecked && otherValue) {
              values.push(otherValue);
            }
            await onClick(element, values);
          } finally {
            setLoading(false);
          }
        }
      }, [isValidSelection, selectedValues, isOtherChecked, otherValue, onClick, element]);

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
                    {option.label || option.value || `${DEFAULT_OPTION_PREFIX} ${index + 1}`}
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
                        placeholder={element.data.otherPlaceholder || 'Other...'}
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
                        {otherValue || element.data.otherPlaceholder || 'Other...'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-center w-full">
              <Button
                forSdk={true}
                disabled={!isValidSelection() || loading}
                onClick={handleSubmit}
              >
                {element.data.buttonText || DEFAULT_BUTTON_TEXT}
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
            <RadioGroup
              onValueChange={(value) => {
                // Only trigger onClick for regular options, not "other"
                // "other" option has its own submit logic in OtherOptionSerialize
                if (value !== 'other') {
                  onClick?.(element, value);
                }
              }}
            >
              {options.map((option, index) => (
                <div className={itemBaseClass} key={index}>
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
                <OtherOptionSerialize
                  element={element}
                  isEditing={isEditing}
                  otherValue={otherValue}
                  setOtherValue={setOtherValue}
                  setIsOtherChecked={setIsOtherChecked}
                  setIsEditing={setIsEditing}
                  otherInputRef={otherInputRef}
                  onClick={onClick}
                  itemBaseClass={itemBaseClass}
                />
              )}
            </RadioGroup>
          </div>
        </div>
      </div>
    );
  },
);

ContentEditorMultipleChoiceSerialize.displayName = 'ContentEditorMultipleChoiceSerialize';
