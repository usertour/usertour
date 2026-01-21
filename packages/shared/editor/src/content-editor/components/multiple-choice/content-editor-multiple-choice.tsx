// Main editable multiple choice component

import { cn } from '@usertour-packages/tailwind';
import { Label } from '@usertour-packages/label';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import * as Widget from '@usertour-packages/widget';
import { isEmptyString } from '@usertour/helpers';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import {
  EditorError,
  EditorErrorAnchor,
  EditorErrorContent,
} from '../../../richtext-editor/editor-error';
import { useContentEditorContext } from '../../../contexts/content-editor-context';
import type {
  ContentEditorMultipleChoiceElement,
  ContentEditorMultipleChoiceOption,
} from '../../../types/editor';
import { DEFAULT_BUTTON_TEXT, DEFAULT_OPTION_PREFIX, OPTION_ITEM_BASE_CLASS } from './constants';
import { MultipleChoicePopoverContent } from './multiple-choice-popover-content';

interface ContentEditorMultipleChoiceProps {
  element: ContentEditorMultipleChoiceElement;
  id: string;
  path: number[];
}

// Memoized radio options preview component
const RadioOptionsPreview = memo(
  ({ options }: { options: ContentEditorMultipleChoiceOption[] }) => (
    <>
      {options.map((option, index) => (
        <div className={OPTION_ITEM_BASE_CLASS} key={index}>
          <Widget.RadioGroupItem value={option.value} id={`r1${index}`} />
          <Label htmlFor={`r1${index}`} className="cursor-pointer grow text-sdk-base leading-none">
            {option.label || option.value}
          </Label>
        </div>
      ))}
    </>
  ),
);

RadioOptionsPreview.displayName = 'RadioOptionsPreview';

// Memoized checkbox options preview component
const CheckboxOptionsPreview = memo(
  ({
    options,
    onCheckedChange,
  }: {
    options: ContentEditorMultipleChoiceOption[];
    onCheckedChange: (index: number, checked: boolean) => void;
  }) => (
    <>
      {options.map((option, index) => (
        <div className={OPTION_ITEM_BASE_CLASS} key={index}>
          <Widget.Checkbox
            checked={option.checked}
            id={`c1${index}`}
            onCheckedChange={(checked) => onCheckedChange(index, checked as boolean)}
          />
          <Label htmlFor={`c1${index}`} className="grow cursor-pointer text-sdk-base leading-none">
            {option.label || option.value || `${DEFAULT_OPTION_PREFIX} ${index + 1}`}
          </Label>
        </div>
      ))}
    </>
  ),
);

CheckboxOptionsPreview.displayName = 'CheckboxOptionsPreview';

// Memoized other option preview component
const OtherOptionPreview = memo(
  ({ placeholder, isRadio }: { placeholder?: string; isRadio: boolean }) => (
    <div className={cn(OPTION_ITEM_BASE_CLASS)}>
      {isRadio ? <Widget.RadioGroupItem value="other" id="other-radio" /> : <Widget.Checkbox />}
      <div className="flex items-center grow gap-2 relative">
        <span className="grow cursor-pointer text-sdk-base leading-none">
          {placeholder || 'Other...'}
        </span>
      </div>
    </div>
  ),
);

OtherOptionPreview.displayName = 'OtherOptionPreview';

export const ContentEditorMultipleChoice = memo((props: ContentEditorMultipleChoiceProps) => {
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

  // Memoize context props to prevent unnecessary re-renders
  const contextProps = useMemo(
    () => ({
      zIndex,
      currentStep,
      currentVersion,
      contentList,
      createStep,
      attributes,
      projectId,
    }),
    [zIndex, currentStep, currentVersion, contentList, createStep, attributes, projectId],
  );

  // Handler for checkbox checked change in preview
  const handleCheckboxChange = useCallback(
    (index: number, checked: boolean) => {
      handleOptionChange(index, 'checked', checked);
    },
    [handleOptionChange],
  );

  return (
    <EditorError open={openError}>
      <EditorErrorAnchor className="w-full">
        <Popover onOpenChange={handleOpenChange} open={isOpen}>
          <PopoverTrigger asChild>
            <div className="flex flex-col gap-2 w-full">
              <div className="space-y-2">
                {!localData.allowMultiple ? (
                  <Widget.RadioGroup defaultValue={localData.options[0]?.value}>
                    <RadioOptionsPreview options={localData.options} />
                    {localData.enableOther && (
                      <OtherOptionPreview placeholder={localData.otherPlaceholder} isRadio />
                    )}
                  </Widget.RadioGroup>
                ) : (
                  <div className="flex flex-col gap-2">
                    <CheckboxOptionsPreview
                      options={localData.options}
                      onCheckedChange={handleCheckboxChange}
                    />
                    {localData.enableOther && (
                      <OtherOptionPreview
                        placeholder={localData.otherPlaceholder}
                        isRadio={false}
                      />
                    )}
                    <div className="flex justify-center w-full">
                      <Widget.Button>{localData.buttonText || DEFAULT_BUTTON_TEXT}</Widget.Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-96 bg-background shadow-lg"
            style={{ zIndex }}
            sideOffset={10}
            side="right"
          >
            <MultipleChoicePopoverContent
              localData={localData}
              onDataChange={handleDataChange}
              onOptionChange={handleOptionChange}
              contextProps={contextProps}
            />
          </PopoverContent>
        </Popover>
      </EditorErrorAnchor>
      <EditorErrorContent side="bottom" style={{ zIndex }}>
        Question name is required
      </EditorErrorContent>
    </EditorError>
  );
});

ContentEditorMultipleChoice.displayName = 'ContentEditorMultipleChoice';
